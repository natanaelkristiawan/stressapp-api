import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProfileService } from './profile.service';
import {
  FriendConnectionsQueryDto,
  FriendDiscoverQueryDto,
  FriendMemberIdParamDto,
} from './dtos/friends.dto';
import { UserFollowEntity } from 'src/entity/user-follow.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';

/** Creates an in-memory UserMimateEntity fixture for unit tests.
 * @returns A populated UserMimateEntity test object.
 */
function createMemberFixture(
  overrides: Partial<UserMimateEntity> & { id: number },
): UserMimateEntity {
  const member = new UserMimateEntity();
  member.id = overrides.id;
  member.name = overrides.name ?? `Member ${overrides.id}`;
  member.mmid_fullname = overrides.mmid_fullname ?? member.name;
  member.email = overrides.email ?? `member${overrides.id}@example.com`;
  member.address = overrides.address ?? 'Jakarta';
  member.profilePictureUrl =
    overrides.profilePictureUrl ??
    'https://s3.temusobat.tech/temu-sobat/sample-friend.jpg';
  member.bio = overrides.bio ?? 'Test bio';
  member.hobby = overrides.hobby ?? 'Membaca, Musik';
  member.is_suspended = overrides.is_suspended ?? false;
  member.deleted_at = overrides.deleted_at ?? undefined;
  member.memberAuthEnabled = overrides.memberAuthEnabled ?? true;
  member.verifiedAt = overrides.verifiedAt ?? new Date('2026-01-01T00:00:00Z');
  member.total_followers = overrides.total_followers ?? 0;
  member.total_followings = overrides.total_followings ?? 0;
  return member;
}

/** Creates an in-memory harness backing ProfileService for friend connection tests.
 * @returns ProfileService instance and mutable member/follow stores.
 */
function createFriendsHarness() {
  const members = new Map<number, UserMimateEntity>([
    [
      1,
      createMemberFixture({
        id: 1,
        name: 'Andi Pratama',
        email: 'andi@example.com',
        address: 'Jakarta',
      }),
    ],
    [
      2,
      createMemberFixture({
        id: 2,
        name: 'Sarah Kim',
        email: 'sarah.kim@example.com',
        address: 'Bandung',
      }),
    ],
    [
      3,
      createMemberFixture({
        id: 3,
        name: 'Budi Santoso',
        email: 'budi@example.com',
        address: 'Surabaya',
      }),
    ],
  ]);

  let nextFollowId = 1;
  const follows: UserFollowEntity[] = [];

  /** Matches a UserFollowEntity against a partial where clause.
   * @returns True when all specified fields match the row.
   */
  function matchesWhere(
    row: UserFollowEntity,
    clause: Record<string, unknown>,
  ): boolean {
    if (
      clause.followerId !== undefined &&
      row.followerId !== clause.followerId
    ) {
      return false;
    }
    if (
      clause.followingId !== undefined &&
      row.followingId !== clause.followingId
    ) {
      return false;
    }
    if (clause.status !== undefined && row.status !== clause.status) {
      return false;
    }
    return true;
  }

  /** Evaluates a single where object or array of OR clauses against follows.
   * @returns Matching UserFollowEntity rows.
   */
  function findFollows(where: unknown): UserFollowEntity[] {
    const clauses = Array.isArray(where) ? where : where ? [where] : [];
    return follows.filter((row) =>
      clauses.some((clause) =>
        matchesWhere(row, clause as Record<string, unknown>),
      ),
    );
  }

  const manager = {
    createQueryBuilder: () => {
      let lockedIds: number[] = [];
      return {
        setLock: () => ({
          where: (_sql: string, params: { orderedIds: number[] }) => {
            lockedIds = params.orderedIds;
            return {
              getMany: async () =>
                lockedIds
                  .map((id) => members.get(id))
                  .filter((item): item is UserMimateEntity => Boolean(item)),
            };
          },
        }),
      };
    },
    find: async (_entity: unknown, options: { where: unknown }) => {
      return findFollows(options.where);
    },
    findOne: async (_entity: unknown, options: { where: unknown }) => {
      const found = findFollows(options.where);
      return found[0] ?? null;
    },
    create: (_entity: unknown, data: Partial<UserFollowEntity>) => {
      const entity = new UserFollowEntity();
      Object.assign(entity, data);
      return entity;
    },
    save: async (_entity: unknown, row: UserFollowEntity) => {
      if (!row.id) {
        row.id = nextFollowId++;
        row.followedAt = new Date('2026-01-02T00:00:00Z');
        follows.push(row);
      }
      return row;
    },
    remove: async (
      _entity: unknown,
      target: UserFollowEntity | UserFollowEntity[],
    ) => {
      const targets = Array.isArray(target) ? target : [target];
      for (const item of targets) {
        const idx = follows.findIndex((row) => row.id === item.id);
        if (idx >= 0) {
          follows.splice(idx, 1);
        }
      }
    },
    update: async (
      _entity: unknown,
      criteria: { id: number },
      partial: Partial<UserMimateEntity>,
    ) => {
      const existing = members.get(criteria.id);
      if (existing) {
        Object.assign(existing, partial);
      }
    },
  };

  const userMimateRepository = {
    manager: {
      transaction: async <T>(
        callback: (entityManager: typeof manager) => Promise<T>,
      ): Promise<T> => callback(manager),
    },
    findOne: async ({ where }: { where: { id: number } }) => {
      return members.get(where.id) ?? null;
    },
    createQueryBuilder: () => {
      let excludedIds: number[] = [];
      let locationFilter = '';
      let searchFilter = '';
      let skipCount = 0;
      let takeCount = 6;

      const builder = {
        where: () => builder,
        andWhere: (sql: string, params?: Record<string, unknown>) => {
          if (params?.excludedIds) {
            excludedIds = params.excludedIds as number[];
          }
          if (typeof params?.locationFilter === 'string') {
            locationFilter = params.locationFilter.replace(/%/g, '');
          }
          if (typeof params?.searchFilter === 'string') {
            searchFilter = params.searchFilter.replace(/%/g, '');
          }
          return builder;
        },
        orderBy: () => builder,
        addOrderBy: () => builder,
        skip: (value: number) => {
          skipCount = value;
          return builder;
        },
        take: (value: number) => {
          takeCount = value;
          return builder;
        },
        getManyAndCount: async (): Promise<[UserMimateEntity[], number]> => {
          const filtered = Array.from(members.values()).filter((member) => {
            if (member.deleted_at || member.is_suspended) {
              return false;
            }
            if (member.memberAuthEnabled && !member.verifiedAt) {
              return false;
            }
            if (excludedIds.includes(member.id)) {
              return false;
            }
            if (
              locationFilter &&
              !(member.address || 'Jakarta')
                .toLowerCase()
                .includes(locationFilter)
            ) {
              return false;
            }
            if (searchFilter) {
              const haystack =
                `${member.name} ${member.mmid_fullname} ${member.email}`.toLowerCase();
              if (!haystack.includes(searchFilter)) {
                return false;
              }
            }
            return true;
          });
          return [
            filtered.slice(skipCount, skipCount + takeCount),
            filtered.length,
          ];
        },
      };
      return builder;
    },
  };

  const followRepository = {
    find: async (options: { where: unknown }) => {
      return findFollows(options.where);
    },
  };

  const postRepository = {
    createQueryBuilder: () => {
      const builder = {
        where: () => builder,
        andWhere: () => builder,
        orderBy: () => builder,
        take: () => builder,
        getManyAndCount: async () => [[], 0],
      };
      return builder;
    },
  };

  const service = new ProfileService(
    userMimateRepository as any,
    followRepository as any,
    {} as any,
    postRepository as any,
    {} as any,
    {} as any,
    { getOrNil: () => null } as any,
    { getDateRange: () => '1 hari yang lalu' } as any,
  );

  return { service, members, follows };
}

describe('Friends Connection Feature (ProfileService & DTOs)', () => {
  it('validates FriendDiscoverQueryDto, FriendConnectionsQueryDto, and FriendMemberIdParamDto', async () => {
    const validDiscover = plainToInstance(FriendDiscoverQueryDto, {
      page: '2',
      pageSize: '6',
      search: '  Sarah  ',
      location: '  Bandung ',
    });
    const discoverErrors = await validate(validDiscover);
    expect(discoverErrors).toHaveLength(0);
    expect(validDiscover.page).toBe(2);
    expect(validDiscover.search).toBe('Sarah');
    expect(validDiscover.location).toBe('Bandung');

    const invalidDiscover = plainToInstance(FriendDiscoverQueryDto, {
      page: '0',
      pageSize: '999',
    });
    const invalidErrors = await validate(invalidDiscover);
    expect(invalidErrors.length).toBeGreaterThanOrEqual(2);

    const validConnections = plainToInstance(FriendConnectionsQueryDto, {
      search: '   ',
      location: 'Jakarta',
    });
    expect(await validate(validConnections)).toHaveLength(0);
    expect(validConnections.search).toBeUndefined();

    const invalidParam = plainToInstance(FriendMemberIdParamDto, { id: '-5' });
    expect((await validate(invalidParam)).length).toBeGreaterThan(0);
  });

  it('rejects self friend requests with BadRequestException', async () => {
    const { service } = createFriendsHarness();
    await expect(service.sendFriendRequest(1, 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('creates a pending friend request, prevents reverse-pending conflict, and accepts into mutual friends', async () => {
    const { service, members } = createFriendsHarness();

    const sent = await service.sendFriendRequest(1, 2);
    expect(sent).toEqual({
      memberId: 2,
      relationshipStatus: 'outgoing_pending',
    });

    const duplicateSent = await service.sendFriendRequest(1, 2);
    expect(duplicateSent).toEqual({
      memberId: 2,
      relationshipStatus: 'outgoing_pending',
    });

    await expect(service.sendFriendRequest(2, 1)).rejects.toThrow(
      ConflictException,
    );

    const beforeAcceptConnections = await service.getFriendConnections(2, {});
    expect(beforeAcceptConnections.requests).toHaveLength(1);
    expect(beforeAcceptConnections.requests[0].memberId).toBe(1);
    expect(beforeAcceptConnections.friends).toHaveLength(0);

    const accepted = await service.acceptFriendRequest(2, 1);
    expect(accepted).toEqual({
      memberId: 1,
      relationshipStatus: 'accepted',
    });
    expect(members.get(1)?.total_followers).toBe(1);
    expect(members.get(2)?.total_followers).toBe(1);

    const user1Connections = await service.getFriendConnections(1, {});
    expect(user1Connections.requests).toHaveLength(0);
    expect(user1Connections.friends).toHaveLength(1);
    expect(user1Connections.friends[0].memberId).toBe(2);

    const user2Connections = await service.getFriendConnections(2, {});
    expect(user2Connections.requests).toHaveLength(0);
    expect(user2Connections.friends).toHaveLength(1);
    expect(user2Connections.friends[0].memberId).toBe(1);

    const discoverForUser1 = await service.discoverMembers(1, {
      page: 1,
      pageSize: 6,
    });
    expect(discoverForUser1.items.map((item) => item.memberId)).toEqual([3]);
  });

  it('deletes a declined friend request row so the sender can send a new request later', async () => {
    const { service, follows } = createFriendsHarness();

    await service.sendFriendRequest(1, 3);
    expect(follows).toHaveLength(1);

    const declined = await service.declineFriendRequest(3, 1);
    expect(declined).toEqual({
      memberId: 1,
      relationshipStatus: 'none',
    });
    expect(follows).toHaveLength(0);

    const resent = await service.sendFriendRequest(1, 3);
    expect(resent).toEqual({
      memberId: 3,
      relationshipStatus: 'outgoing_pending',
    });
    expect(follows).toHaveLength(1);

    await expect(service.declineFriendRequest(3, 999)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns member profile details with relationshipStatus and connection count', async () => {
    const { service } = createFriendsHarness();

    await service.sendFriendRequest(1, 2);
    const pendingProfile = await service.getFriendMemberProfile(1, 2);
    expect(pendingProfile.relationshipStatus).toBe('outgoing_pending');
    expect(pendingProfile.connectionsCount).toBe(0);

    await service.acceptFriendRequest(2, 1);
    const acceptedProfile = await service.getFriendMemberProfile(1, 2);
    expect(acceptedProfile.relationshipStatus).toBe('accepted');
    expect(acceptedProfile.connectionsCount).toBe(1);
    expect(acceptedProfile.connectionsLabel).toBe('1 koneksi');
  });
});
