import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { InjectDataSource } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { Member } from '../entity/user-mimate.entity';
import { MemberOtp } from '../entity/member-otp.entity';
export const OTP_EMAIL_QUEUE = 'member-otp-email';
export type OtpEmailJob = {
  memberId: number;
  purpose: 'registration' | 'recovery';
  code: string;
  codeHash: string;
};
@Processor(OTP_EMAIL_QUEUE)
export class MemberOtpEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(MemberOtpEmailProcessor.name);
  /** Injects delivery dependencies. Returns a worker hosted in the API process. */
  constructor(
    @InjectDataSource('mimate') private readonly db: DataSource,
    private readonly mail: MailerService,
    private readonly config: ConfigService,
  ) {
    super();
  }
  /** Sends the current unused OTP. Returns void; mail failures trigger queue retry. */
  async process(job: Job<OtpEmailJob>): Promise<void> {
    const { memberId, purpose, code, codeHash } = job.data;
    const otp = await this.db
      .getRepository(MemberOtp)
      .findOneBy({ memberId, purpose });
    if (
      !otp ||
      otp.codeHash !== codeHash ||
      otp.consumedAt ||
      otp.attempts >= 5 ||
      otp.expiresAt.getTime() <= Date.now()
    )
      return;
    const member = await this.db
      .getRepository(Member)
      .findOneBy({ id: memberId });
    if (
      !member ||
      !member.memberAuthEnabled ||
      member.is_suspended ||
      member.deleted_at ||
      (purpose === 'registration' ? !!member.verifiedAt : !member.verifiedAt)
    )
      return;
    try {
      await this.mail.sendMail({
        from: this.config.get<string>('EMAIL_FROM'),
        to: member.email,
        subject:
          purpose === 'registration'
            ? 'Verifikasi akun Temu SoBAT'
            : 'Reset kata sandi Temu SoBAT',
        text: `Kode OTP Anda: ${code}. Berlaku 5 menit. Jangan bagikan kode ini kepada siapa pun.`,
      });
    } catch {
      // Prevent SMTP details and credentials from entering persisted job errors.
      throw new Error('OTP email delivery failed');
    }
  }
  /** Reports exhausted retries without recipient or OTP data. Returns void. */
  @OnWorkerEvent('failed')
  failed(job: Job<OtpEmailJob>): void {
    if (job && job.attemptsMade >= (job.opts.attempts || 1))
      this.logger.error(
        'OTP email delivery exhausted retries; user can request a new code.',
      );
  }
}
