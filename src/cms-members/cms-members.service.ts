import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { Member } from '../entity/user-mimate.entity';
import { MemberSession } from '../entity/member-session.entity';
import { MemberOtp } from '../entity/member-otp.entity';
import { Activity } from '../entity/activity.entity';
import {
  EditMemberDto,
  MemberListDto,
  MemberVersionDto,
  SuspendMemberDto,
  VerifyMemberDto,
} from './cms-members.dto';

/** Selects only CMS-approved profile fields. Returns no auth secrets or private content. */
export function memberView(member: Member) {
  return {
    id: member.id,
    name: member.name || '',
    username: member.username || '',
    email: member.email || '',
    photoUrl: member.profilePictureUrl || '',
    createdAt: member.created_at.toISOString(),
    updatedAt: member.updated_at.toISOString(),
    emailVerified: !!member.verifiedAt,
    profileVerified: !!member.member_verified,
    suspended: !!member.is_suspended,
    suspendReason: member.suspend_reason || '',
    location: member.location || '',
    bio: member.bio || '',
    preferences: member.preferences || [],
  };
}

@Injectable()
export class CmsMembersService {
  /** Injects the shared database. Returns a stateless member-management service. */
  constructor(@InjectDataSource('mimate') private readonly db: DataSource) {}

  /** Restricts queries to live mobile accounts without CMS credential links. Returns the query. */
  private mobile(manager: EntityManager): SelectQueryBuilder<Member> {
    return manager
      .getRepository(Member)
      .createQueryBuilder('member')
      .where('member.memberAuthEnabled = :enabled', { enabled: true })
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM users staff WHERE staff.backup_member_id = member.id)',
      );
  }

  /** Applies substring/date filters and server pagination. Returns safe rows and accurate totals. */
  async list(query: MemberListDto) {
    if (query.startDate && query.endDate && query.startDate > query.endDate) {
      throw new BadRequestException('Start date must not be after end date.');
    }
    const builder = this.mobile(this.db.manager);
    if (query.name)
      builder.andWhere('LOCATE(:name, LOWER(member.name)) > 0', {
        name: query.name.toLowerCase(),
      });
    if (query.email)
      builder.andWhere('LOCATE(:email, LOWER(member.email)) > 0', {
        email: query.email.toLowerCase(),
      });
    if (query.startDate)
      builder.andWhere('member.created_at >= :start', {
        start: new Date(`${query.startDate}T00:00:00.000Z`),
      });
    if (query.endDate) {
      const end = new Date(`${query.endDate}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      builder.andWhere('member.created_at < :end', { end });
    }
    const [rows, total] = await builder
      .orderBy('member.created_at', 'DESC')
      .addOrderBy('member.id', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return {
      items: rows.map(memberView),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Loads one manageable mobile member. Returns 404 for missing, deleted or staff accounts. */
  private async find(
    manager: EntityManager,
    id: number,
    lock = false,
  ): Promise<Member> {
    const query = this.mobile(manager).andWhere('member.id = :id', { id });
    if (lock) query.setLock('pessimistic_write');
    const member = await query.getOne();
    if (!member) throw new NotFoundException('Mobile member not found.');
    return member;
  }

  /** Loads a safe member detail. Returns public profile and account status only. */
  async detail(id: number) {
    return memberView(await this.find(this.db.manager, id));
  }

  /** Locks a member, rejects stale edits and writes an atomic audit event. Returns the updated profile. */
  private async change(
    id: number,
    actorId: number,
    version: MemberVersionDto,
    action: string,
    apply: (manager: EntityManager, member: Member) => Promise<void>,
  ) {
    return this.db.transaction(async (manager) => {
      const member = await this.find(manager, id, true);
      if (
        member.updated_at.getTime() !== new Date(version.updatedAt).getTime()
      ) {
        throw new ConflictException(
          'Member changed. Reload the profile before trying again.',
        );
      }
      // Millisecond versions must advance even when two writes arrive within the same clock tick.
      member.updated_at = new Date(
        Math.max(Date.now(), member.updated_at.getTime() + 1),
      );
      await apply(manager, member);
      await manager.save(Activity, {
        userId: actorId,
        targetUserId: id,
        action,
        source: 'cms',
        targetType: 'member',
      });
      return memberView(member);
    });
  }

  /** Updates only approved profile fields. Returns 409 for duplicate usernames or stale data. */
  async edit(id: number, actorId: number, input: EditMemberDto) {
    try {
      return await this.change(
        id,
        actorId,
        input,
        'member.profile.updated',
        async (manager, member) => {
          member.name = input.name;
          member.username = input.username || null;
          member.profilePictureUrl = input.photoUrl || null;
          await manager.save(Member, member);
        },
      );
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException('That username is already in use.');
      }
      throw error;
    }
  }

  /** Changes suspension and revokes sessions/OTPs when suspending. Returns the current profile. */
  async suspend(id: number, actorId: number, input: SuspendMemberDto) {
    return this.change(
      id,
      actorId,
      input,
      input.suspended ? 'member.suspended' : 'member.unsuspended',
      async (manager, member) => {
        member.is_suspended = input.suspended;
        member.suspend_reason = input.suspended ? input.reason : null;
        await manager.save(Member, member);
        if (input.suspended) await this.revoke(manager, id);
      },
    );
  }

  /** Changes the profile badge independently of email OTP verification. Returns the updated profile. */
  async verify(id: number, actorId: number, input: VerifyMemberDto) {
    return this.change(
      id,
      actorId,
      input,
      'member.badge.updated',
      async (manager, member) => {
        member.member_verified = input.verified;
        await manager.save(Member, member);
      },
    );
  }

  /** Soft-deletes a mobile account and revokes its auth proofs. Returns the retained profile identity. */
  async remove(id: number, actorId: number, input: MemberVersionDto) {
    return this.change(
      id,
      actorId,
      input,
      'member.deleted',
      async (manager, member) => {
        await this.revoke(manager, id);
        await manager.softRemove(Member, member);
      },
    );
  }

  /** Removes active sessions and pending OTPs under the member lock. Returns after revocation. */
  private async revoke(
    manager: EntityManager,
    memberId: number,
  ): Promise<void> {
    await manager.delete(MemberSession, { memberId });
    await manager.delete(MemberOtp, { memberId });
  }
}
