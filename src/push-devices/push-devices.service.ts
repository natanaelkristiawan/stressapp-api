import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { MemberPushDevice } from '../entity/member-push-device.entity';
import { MemberSession } from '../entity/member-session.entity';
import { Member } from '../entity/user-mimate.entity';
import { SavePushDeviceDto, PushPlatformDto } from './push-devices.dto';

@Injectable()
export class PushDevicesService {
  /** Reuses the existing datasource. Returns session-owned push registration operations. */
  constructor(
    @InjectDataSource('mimate') private readonly dataSource: DataSource,
  ) {}

  /** Associates one opaque token with this login installation. Returns safe metadata, never a token/session identifier. */
  async save(memberId: number, sessionId: string, input: SavePushDeviceDto) {
    if (
      (input.platform === 'ios') !== (input.provider === 'apns') ||
      (input.provider === 'apns' && !/^[a-fA-F0-9]{64}$/.test(input.token))
    ) {
      throw new BadRequestException(
        'Invalid push provider or token for this platform.',
      );
    }
    const token =
      input.provider === 'apns' ? input.token.toLowerCase() : input.token;
    const tokenHash = createHash('sha256')
      .update(`${input.provider}:${token}`)
      .digest('hex');
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Same member-first order as auth refresh/revocation; session FK also rejects revoked registrations.
        const member = await manager.findOne(Member, {
          where: { id: memberId },
          lock: { mode: 'pessimistic_write' },
        });
        const session = await manager.findOne(MemberSession, {
          where: { tokenHash: sessionId, memberId },
          lock: { mode: 'pessimistic_write' },
        });
        if (
          !member?.memberAuthEnabled ||
          !member.verifiedAt ||
          member.is_suspended ||
          !session ||
          session.expiresAt.getTime() <= Date.now()
        ) {
          throw new UnauthorizedException('Sesi tidak valid.');
        }
        // A single token must never remain subscribed to two accounts or old login sessions.
        await manager
          .createQueryBuilder()
          .delete()
          .from(MemberPushDevice)
          .where('tokenHash = :tokenHash AND sessionId <> :sessionId', {
            tokenHash,
            sessionId,
          })
          .execute();
        let device = await manager.findOneBy(MemberPushDevice, {
          sessionId,
          platform: input.platform,
        });
        const now = new Date();
        if (!device) {
          device = manager.create(MemberPushDevice, {
            sessionId,
            platform: input.platform,
            createdAt: now,
          });
        }
        device.provider = input.provider;
        device.token = token;
        device.tokenHash = tokenHash;
        device.updatedAt = now;
        await manager.save(device);
        return {
          registered: true,
          platform: device.platform,
          provider: device.provider,
          updatedAt: now.toISOString(),
        };
      });
    } catch (error) {
      const code: unknown =
        error && typeof error === 'object' && 'code' in error
          ? error.code
          : null;
      if (code === 'ER_DUP_ENTRY' || code === 'ER_LOCK_DEADLOCK') {
        throw new ConflictException(
          'Push registration changed. Retry this request.',
        );
      }
      throw error;
    }
  }

  /** Removes only this session's platform subscription. Returns idempotent safe confirmation. */
  async remove(sessionId: string, platform: PushPlatformDto['platform']) {
    await this.dataSource
      .getRepository(MemberPushDevice)
      .delete({ sessionId, platform });
    return { registered: false, platform };
  }

  /** Resolves all live installations for a future delivery worker. Returns distinct tokens only inside the API. */
  async recipients(memberId: number) {
    return this.dataSource
      .getRepository(MemberPushDevice)
      .createQueryBuilder('device')
      .innerJoin('device.session', 'session')
      .innerJoin('session.member', 'member')
      .where('session.memberId = :memberId AND session.expiresAt > :now', {
        memberId,
        now: new Date(),
      })
      .andWhere(
        'member.memberAuthEnabled = :enabled AND member.is_suspended = :suspended',
        { enabled: true, suspended: false },
      )
      .andWhere('member.deleted_at IS NULL AND member.verifiedAt IS NOT NULL')
      .addSelect('device.token')
      .getMany();
  }
}
