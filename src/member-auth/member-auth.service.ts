import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OtpEmailJob, OTP_EMAIL_QUEUE } from './member-auth.email.processor';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'crypto';
import * as bcrypt from 'bcrypt';
import { Member } from '../entity/user-mimate.entity';
import { MemberOtp } from '../entity/member-otp.entity';
import { MemberSession } from '../entity/member-session.entity';
import { LoginDto, RegisterDto, VerifyOtpDto } from './member-auth.dto';

const GENERIC = {
  message: 'Jika akun memenuhi syarat, kode OTP dikirim ke email Anda.',
};
const INVALID = 'Kode OTP tidak valid atau kedaluwarsa.';
@Injectable()
export class MemberAuthService {
  private readonly dummyHash = bcrypt.hash('invalid-password', 12);
  /** Injects database, email queue, rate limiting, configuration and JWT dependencies.
   * @returns A service instance; no credentials are stored in mutable request state.
   */
  constructor(
    @InjectDataSource('mimate') private readonly db: DataSource,
    @InjectQueue(OTP_EMAIL_QUEUE) private readonly emails: Queue<OtpEmailJob>,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}
  /** Hashes high-entropy session, refresh or reset values for database lookup.
   * @returns A SHA-256 hex digest; never the original credential.
   */
  hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
  /** Binds a short OTP to its member and purpose using the server secret.
   * @returns A keyed SHA-256 hex digest for constant-time comparison.
   */
  private otpHash(id: number, purpose: string, code: string) {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
      .update(`${id}:${purpose}:${code}`)
      .digest('hex');
  }
  /** Atomically counts requests in Redis and rejects an exhausted rate limit.
   * @returns Promise<void>; throws HTTP 429 when the limit is exceeded.
   */
  async limit(scope: string, value: string, maximum: number, seconds: number) {
    const client = this.redis.getOrThrow('default');
    const count = await client.eval(
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
      1,
      `member-auth:${scope}:${this.hash(value)}`,
      seconds,
    );
    if (Number(count) > maximum)
      throw new HttpException(
        'Terlalu banyak percobaan. Silakan coba lagi nanti.',
        429,
      );
  }
  /** Checks member-login eligibility and the shared suspension/deletion state.
   * @returns A truthy eligibility result; null/false when access is disallowed.
   */
  private active(member: Member | null) {
    return member && member.memberAuthEnabled && !member.is_suspended && !member.deleted_at;
  }
  /** Builds the public member identity without credentials or private columns.
   * @returns The member ID, email, display name and verification status.
   */
  private view(member: Member) {
    return {
      id: member.id,
      email: member.email,
      name: member.name,
      emailVerified: !!member.verifiedAt,
    };
  }
  /** Creates or updates a pending registration and requests its verification OTP.
   * @returns A generic delivery notice; verified accounts remain unchanged.
   */
  async register(dto: RegisterDto) {
    await this.limit('registration', dto.email, 5, 3600);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    try {
      await this.db.getRepository(Member).insert({
        email: dto.email,
        name: dto.name,
        passwordHash,
        termsAcceptedAt: new Date(),
        created_at: new Date(),
        memberAuthEnabled: true,
      });
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !('code' in error) ||
        error.code !== 'ER_DUP_ENTRY'
      )
        throw error;
    }
    return this.sendOtp(dto.email, 'registration', {
      passwordHash,
      name: dto.name,
    });
  }
  /** Replaces a purpose-specific OTP, commits it, then queues email delivery.
   * @returns A generic notice, or an error when throttled/queue submission fails.
   */
  async sendOtp(
    email: string,
    purpose: 'registration' | 'recovery',
    pending?: { passwordHash: string; name: string },
  ) {
    await this.limit('send-email', email, 5, 3600);
    await this.limit('send-cooldown', email, 1, 60);
    const delivery = await this.db.transaction(async (manager) => {
      const member = await manager.findOne(Member, {
        where: { email },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !this.active(member) ||
        (purpose === 'registration' ? !!member.verifiedAt : !member.verifiedAt)
      )
        return;
      if (pending && purpose === 'registration') {
        await manager.update(Member, member.id, pending);
      }
      const code = randomInt(10000).toString().padStart(4, '0');
      await manager.delete(MemberOtp, { memberId: member.id, purpose });
      await manager.save(MemberOtp, {
        memberId: member.id,
        purpose,
        codeHash: this.otpHash(member.id, purpose, code),
        attempts: 0,
        expiresAt: new Date(Date.now() + 300000),
        sentAt: new Date(),
        consumedAt: null,
        resetHash: null,
        resetExpiresAt: null,
      });
      return {
        memberId: member.id,
        purpose,
        code,
        codeHash: this.otpHash(member.id, purpose, code),
      };
    });
    if (delivery) {
      try {
        await this.emails.add('send-otp', delivery, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: true,
        });
      } catch {
        throw new ServiceUnavailableException(
          'Gagal menjadwalkan email. Silakan kirim ulang kode setelah 60 detik.',
        );
      }
    }
    return GENERIC;
  }
  /** Consumes a valid OTP once; registration also proves the pending password.
   * @returns A logged-in session for registration, or a short-lived recovery reset token.
   */
  async verify(dto: VerifyOtpDto) {
    await this.limit('verify-email', dto.email, 10, 3600);
    const result = await this.db.transaction(async (manager) => {
      const member = await manager.findOne(Member, {
        where: { email: dto.email },
        lock: { mode: 'pessimistic_write' },
      });
      if (!this.active(member)) return null;
      const otp = await manager.findOneBy(MemberOtp, {
        memberId: member.id,
        purpose: dto.purpose,
      });
      if (
        !otp ||
        otp.consumedAt ||
        otp.attempts >= 5 ||
        otp.expiresAt.getTime() <= Date.now()
      )
        return null;
      otp.attempts++;
      const passwordMember =
        dto.purpose === 'registration'
          ? await manager
              .getRepository(Member)
              .createQueryBuilder('member')
              .addSelect('member.passwordHash')
              .where('member.id = :id', { id: member.id })
              .getOne()
          : null;
      const passwordValid =
        dto.purpose !== 'registration' ||
        (!!dto.password &&
          !!passwordMember &&
          (await bcrypt.compare(dto.password, passwordMember.passwordHash)));
      const valid =
        passwordValid &&
        timingSafeEqual(
          Buffer.from(otp.codeHash, 'hex'),
          Buffer.from(this.otpHash(member.id, dto.purpose, dto.code), 'hex'),
        );
      if (!valid) {
        await manager.save(otp);
        return null;
      }
      otp.consumedAt = new Date();
      if (dto.purpose === 'registration') {
        member.verifiedAt = new Date();
        await manager.save(member);
        await manager.save(otp);
        return this.createSession(manager, member);
      }
      const resetToken = randomBytes(32).toString('hex');
      otp.resetHash = this.hash(resetToken);
      otp.resetExpiresAt = new Date(Date.now() + 600000);
      await manager.save(otp);
      return { resetToken, message: 'Kode berhasil diverifikasi.' };
    });
    if (!result) throw new BadRequestException(INVALID);
    return result;
  }
  /** Selects or derives a signing key isolated from legacy admin authentication.
   * @returns The private member JWT signing key; it must never be logged.
   */
  private jwtSecret() {
    // Separate signing key keeps member JWTs outside legacy admin/external auth.
    return (
      this.config.get<string>('MEMBER_JWT_SECRET') ||
      createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
        .update('temu-sobat-member-access-v1')
        .digest('hex')
    );
  }
  /** Signs a one-day access JWT and formats the corresponding refresh session.
   * @returns Access/refresh credentials, expiry timestamps and public member identity.
   */
  private issue(member: Member, session: MemberSession, refreshToken: string) {
    const token = this.jwt.sign(
      {
        sid: session.tokenHash,
        kind: 'member-access',
        jti: randomBytes(16).toString('hex'),
      },
      {
        secret: this.jwtSecret(),
        algorithm: 'HS256',
        issuer: 'temu-sobat',
        audience: 'member',
        subject: String(member.id),
        expiresIn: 86400,
      },
    );
    const claims: unknown = this.jwt.decode(token);
    if (
      !claims ||
      typeof claims !== 'object' ||
      !('exp' in claims) ||
      typeof claims.exp !== 'number'
    )
      throw new Error('Invalid issued token');
    return {
      token,
      expiresAt: new Date(claims.exp * 1000).toISOString(),
      refreshToken,
      refreshExpiresAt: session.expiresAt.toISOString(),
      member: this.view(member),
    };
  }
  /** Verifies JWT signature, expiry, issuer, audience and member claim shape.
   * @returns The validated session ID and member ID; throws 401 for invalid tokens.
   */
  private claims(token: string) {
    try {
      const claims: unknown = this.jwt.verify(token, {
        secret: this.jwtSecret(),
        algorithms: ['HS256'],
        issuer: 'temu-sobat',
        audience: 'member',
      });
      if (
        !claims ||
        typeof claims !== 'object' ||
        !('sid' in claims) ||
        typeof claims.sid !== 'string' ||
        !/^[a-f0-9]{64}$/.test(claims.sid) ||
        !('sub' in claims) ||
        typeof claims.sub !== 'string' ||
        !/^[1-9][0-9]*$/.test(claims.sub) ||
        !('kind' in claims) ||
        claims.kind !== 'member-access' ||
        !('exp' in claims) ||
        typeof claims.exp !== 'number'
      )
        throw new Error('Invalid claims');
      if (!Number.isSafeInteger(Number(claims.sub)))
        throw new Error('Invalid subject');
      return { sid: claims.sid, memberId: Number(claims.sub) };
    } catch {
      throw new UnauthorizedException(
        'Sesi kedaluwarsa atau tidak valid. Silakan masuk kembali.',
      );
    }
  }
  /** Creates a revocable session after password login or registration verification.
   * @returns One-day access JWT, refresh credentials and public member identity.
   */
  private async createSession(
    manager: EntityManager,
    member: Member,
    rememberMe = false,
  ) {
    const refreshToken = `refresh_${randomBytes(32).toString('hex')}`;
    const session = await manager.save(MemberSession, {
      tokenHash: randomBytes(32).toString('hex'),
      memberId: member.id,
      refreshHash: this.hash(refreshToken),
      expiresAt: new Date(
        Math.floor(Date.now() / 1000) * 1000 + (rememberMe ? 30 : 7) * 86400000,
      ),
    });
    return this.issue(member, session, refreshToken);
  }
  /** Checks password/account verification and creates an independent refresh session.
   * @returns A one-day JWT and refresh credentials lasting 7 or 30 days.
   */
  async login(dto: LoginDto) {
    await this.limit('login-email', dto.email, 10, 900);
    return this.db.transaction(async (manager) => {
      const member = await manager
        .getRepository(Member)
        .createQueryBuilder('member')
        .addSelect('member.passwordHash')
        .where('member.email = :email', { email: dto.email })
        .setLock('pessimistic_write')
        .getOne();
      const valid = await bcrypt.compare(
        dto.password,
        member?.passwordHash ?? (await this.dummyHash),
      );
      if (!valid || !this.active(member))
        throw new UnauthorizedException('Email atau kata sandi tidak valid.');
      if (!member.verifiedAt)
        throw new HttpException(
          'Email belum diverifikasi. Silakan verifikasi OTP.',
          403,
        );
      return this.createSession(manager, member, dto.rememberMe);
    });
  }
  /** Atomically rotates a live refresh credential without extending session lifetime.
   * @returns A fresh access/refresh pair; reused, expired or revoked credentials get 401.
   */
  async refresh(refreshToken: string) {
    const refreshHash = this.hash(refreshToken);
    const candidate = await this.db
      .getRepository(MemberSession)
      .findOneBy({ refreshHash });
    if (!candidate)
      throw new UnauthorizedException(
        'Sesi tidak valid. Silakan masuk kembali.',
      );
    return this.db.transaction(async (manager) => {
      // Member-first locking matches password reset/login and prevents revocation races.
      const member = await manager.findOne(Member, {
        where: { id: candidate.memberId },
        lock: { mode: 'pessimistic_write' },
      });
      const session = await manager.findOneBy(MemberSession, {
        tokenHash: candidate.tokenHash,
        refreshHash,
      });
      if (
        !session ||
        session.expiresAt.getTime() <= Date.now() ||
        !this.active(member) ||
        !member.verifiedAt
      )
        throw new UnauthorizedException(
          'Sesi kedaluwarsa atau tidak valid. Silakan masuk kembali.',
        );
      const next = `refresh_${randomBytes(32).toString('hex')}`;
      session.refreshHash = this.hash(next);
      await manager.save(session);
      return this.issue(member, session, next);
    });
  }
  /** Checks the access JWT and live database session/account on every request.
   * @returns Public member identity; expired or revoked access throws 401.
   */
  async authenticate(token: string) {
    return (await this.authenticateSession(token)).member;
  }
  /** Resolves the same live identity plus its server-owned session key for installation-scoped resources.
   * @returns Internal session context; never returned as a public auth response.
   */
  async authenticateSession(token: string) {
    const claims = this.claims(token);
    const session = await this.db
      .getRepository(MemberSession)
      .findOneBy({ tokenHash: claims.sid });
    if (
      !session ||
      session.memberId !== claims.memberId ||
      session.expiresAt.getTime() <= Date.now()
    )
      throw new UnauthorizedException('Sesi tidak valid.');
    const member = await this.db
      .getRepository(Member)
      .findOneBy({ id: session.memberId });
    if (!this.active(member) || !member.verifiedAt)
      throw new UnauthorizedException('Sesi tidak valid.');
    return { member: this.view(member), sessionId: session.tokenHash };
  }
  /** Revokes the JWT session and its refresh credential together.
   * @returns A logout confirmation; other independent sessions remain active.
   */
  async logout(token: string) {
    await this.authenticate(token);
    await this.db
      .getRepository(MemberSession)
      .delete({ tokenHash: this.claims(token).sid });
    return { message: 'Berhasil keluar.' };
  }
  /** Consumes recovery proof, changes the password and revokes all member sessions.
   * @returns A password-reset confirmation; invalid/reused proof throws an error.
   */
  async reset(resetToken: string, password: string) {
    const resetHash = this.hash(resetToken);
    const candidate = await this.db
      .getRepository(MemberOtp)
      .findOneBy({ resetHash, purpose: 'recovery' });
    if (!candidate)
      throw new BadRequestException(
        'Bukti reset tidak valid atau kedaluwarsa.',
      );
    const passwordHash = await bcrypt.hash(password, 12);
    await this.db.transaction(async (manager) => {
      const member = await manager.findOne(Member, {
        where: { id: candidate.memberId },
        lock: { mode: 'pessimistic_write' },
      });
      const otp = await manager.findOneBy(MemberOtp, {
        id: candidate.id,
        resetHash,
      });
      if (
        !this.active(member) ||
        !otp?.consumedAt ||
        !otp.resetExpiresAt ||
        otp.resetExpiresAt.getTime() <= Date.now()
      )
        throw new BadRequestException(
          'Bukti reset tidak valid atau kedaluwarsa.',
        );
      await manager.update(Member, member.id, { passwordHash });
      await manager.delete(MemberSession, { memberId: member.id });
      await manager.delete(MemberOtp, { memberId: member.id });
    });
    return { message: 'Kata sandi diperbarui. Silakan masuk kembali.' };
  }
}
