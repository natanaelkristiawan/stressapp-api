import 'reflect-metadata';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DirectMessageService } from './direct-message.service';
import {
  ConversationIdParamDto,
  FindOrCreateConversationDto,
} from './dto/dm-create.dto';
import { SendMessageDto } from './dto/dm-send.dto';
import { DmSearchDto } from './dto/dm-search.dto';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { Conversation } from 'src/entity/convertation.entity';
import { Message } from 'src/entity/message.entity';
import { UserFollowEntity } from 'src/entity/user-follow.entity';
import { DateHelper } from 'src/common/helpers/date.helper';

/** Creates an in-memory UserMimateEntity fixture for direct-message unit tests.
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
  member.profilePictureUrl = overrides.profilePictureUrl ?? undefined;
  member.hobby = overrides.hobby ?? 'Musik, Membaca';
  member.is_suspended = overrides.is_suspended ?? false;
  member.deleted_at = overrides.deleted_at ?? undefined;
  return member;
}

/** Creates an in-memory harness backing DirectMessageService for unit tests.
 * @returns DirectMessageService instance and mutable member, follow, conversation, and message stores.
 */
function createDirectMessageHarness() {
  const members = new Map<number, UserMimateEntity>([
    [
      1,
      createMemberFixture({
        id: 1,
        name: 'Andi Pratama',
        hobby: 'Musik, Olahraga',
      }),
    ],
    [
      2,
      createMemberFixture({
        id: 2,
        name: 'Sarah Kim',
        hobby: 'Membaca, Musik',
      }),
    ],
    [
      3,
      createMemberFixture({
        id: 3,
        name: 'Budi Santoso',
        hobby: 'Game',
      }),
    ],
  ]);

  const follows: UserFollowEntity[] = [];
  const conversations: Conversation[] = [];
  const messages: Message[] = [];
  let nextConversationId = 1;
  let nextMessageId = 1;

  /** Evaluates a single where object or array of OR clauses against follows.
   * @returns Matching UserFollowEntity rows.
   */
  function findFollows(where: unknown): UserFollowEntity[] {
    const clauses = Array.isArray(where) ? where : where ? [where] : [];
    return follows.filter((row) =>
      clauses.some((clause) => {
        const record = clause as Record<string, unknown>;
        if (
          record.followerId !== undefined &&
          row.followerId !== record.followerId
        ) {
          return false;
        }
        if (
          record.followingId !== undefined &&
          row.followingId !== record.followingId
        ) {
          return false;
        }
        if (record.status !== undefined && row.status !== record.status) {
          return false;
        }
        return true;
      }),
    );
  }

  /** Evaluates conversation repository find options against in-memory conversations.
   * @returns Matching Conversation entities.
   */
  function findConversations(options: Record<string, unknown>): Conversation[] {
    const where = (options?.where ?? {}) as Record<string, unknown>;
    const participantsFilter = where.participants as
      | { id?: number }
      | undefined;
    const idFilter = where.id as { _value?: number[] } | number | undefined;

    return conversations
      .filter((conv) => {
        if (conv.deletedAt) {
          return false;
        }
        if (
          participantsFilter?.id !== undefined &&
          !conv.participants.some((p) => p.id === participantsFilter.id)
        ) {
          return false;
        }
        if (typeof idFilter === 'number' && conv.id !== idFilter) {
          return false;
        }
        if (
          idFilter &&
          typeof idFilter === 'object' &&
          Array.isArray((idFilter as { _value?: number[] })._value)
        ) {
          const allowed = (idFilter as { _value: number[] })._value;
          if (!allowed.includes(conv.id)) {
            return false;
          }
        }
        return true;
      })
      .map((conv) => ({
        ...conv,
        messages: messages.filter((msg) => msg.conversation?.id === conv.id),
      }));
  }

  const conversationRepository = {
    find: async (options: Record<string, unknown>) =>
      findConversations(options),
    findOne: async (options: Record<string, unknown>) => {
      const where = (options?.where ?? {}) as { id?: number };
      const conv = conversations.find(
        (row) => row.id === where.id && !row.deletedAt,
      );
      if (!conv) {
        return null;
      }
      return {
        ...conv,
        messages: messages.filter((msg) => msg.conversation?.id === conv.id),
      };
    },
    create: (data: Partial<Conversation>) => {
      const conv = new Conversation();
      conv.participants = data.participants ?? [];
      conv.messages = [];
      return conv;
    },
    save: async (conv: Conversation) => {
      if (!conv.id) {
        conv.id = nextConversationId++;
        conv.createdAt = new Date('2026-04-20T09:00:00Z');
        conv.updatedAt = new Date('2026-04-20T09:00:00Z');
        conversations.push(conv);
      }
      return conv;
    },
    update: async (
      criteria: { id?: number },
      partial: Partial<Conversation>,
    ) => {
      const conv = conversations.find((row) => row.id === criteria.id);
      if (conv && partial.updatedAt) {
        conv.updatedAt = partial.updatedAt;
      }
      return { affected: 1 };
    },
    softDelete: async (id: number) => {
      const conv = conversations.find((row) => row.id === id);
      if (conv) {
        conv.deletedAt = new Date();
      }
      return { affected: conv ? 1 : 0 };
    },
  };

  /** Builds a mock query builder for Message unread queries and readBy relation updates.
   * @returns Mock query builder.
   */
  function createMessageQueryBuilder() {
    let conversationIdParam: number | undefined;
    let senderIdParam: number | undefined;
    let excludeUserIdParam: number | undefined;
    let readerUserIdParam: number | undefined;
    let targetMessage: Message | undefined;

    const qb = {
      leftJoin: () => qb,
      where: (_sql: string, params?: Record<string, unknown>) => {
        if (typeof params?.conversationId === 'number') {
          conversationIdParam = params.conversationId;
        }
        return qb;
      },
      andWhere: (sqlOrFn: unknown, params?: Record<string, unknown>) => {
        if (typeof params?.senderId === 'number') {
          senderIdParam = params.senderId;
        }
        if (typeof params?.userId === 'number') {
          excludeUserIdParam = params.userId;
        }
        if (typeof sqlOrFn === 'function') {
          const dummySub = {
            subQuery: () => dummySub,
            select: () => dummySub,
            from: () => dummySub,
            where: () => dummySub,
            getQuery: () => '(SELECT 1)',
          };
          (sqlOrFn as (sub: typeof dummySub) => string)(dummySub);
        }
        return qb;
      },
      setParameter: (key: string, value: unknown) => {
        if (key === 'userId' && typeof value === 'number') {
          readerUserIdParam = value;
        }
        return qb;
      },
      getUnreadMatches: (): Message[] => {
        return messages.filter((msg) => {
          if (
            conversationIdParam !== undefined &&
            msg.conversation?.id !== conversationIdParam
          ) {
            return false;
          }
          if (senderIdParam !== undefined && msg.sender?.id !== senderIdParam) {
            return false;
          }
          if (
            excludeUserIdParam !== undefined &&
            msg.sender?.id === excludeUserIdParam
          ) {
            return false;
          }
          const readByList = msg.readBy ?? [];
          if (
            readerUserIdParam !== undefined &&
            readByList.some((reader) => reader.id === readerUserIdParam)
          ) {
            return false;
          }
          return true;
        });
      },
      getCount: async () => qb.getUnreadMatches().length,
      getMany: async () => qb.getUnreadMatches(),
      relation: () => qb,
      of: (msg: Message) => {
        targetMessage = msg;
        return qb;
      },
      add: async (userId: number) => {
        if (targetMessage) {
          if (!Array.isArray(targetMessage.readBy)) {
            targetMessage.readBy = [];
          }
          const user = members.get(userId);
          if (
            user &&
            !targetMessage.readBy.some((reader) => reader.id === userId)
          ) {
            targetMessage.readBy.push(user);
          }
        }
      },
    };
    return qb;
  }

  const messageRepository = {
    createQueryBuilder: () => createMessageQueryBuilder(),
    save: async (msg: Message) => {
      if (!msg.id) {
        msg.id = nextMessageId++;
      }
      if (!msg.createdAt) {
        msg.createdAt = new Date(Date.UTC(2026, 3, 20, 9, msg.id, 0));
      }
      if (!Array.isArray(msg.readBy)) {
        msg.readBy = [];
      }
      messages.push(msg);
      return msg;
    },
    find: async (options: Record<string, unknown>) => {
      const where = options.where as { conversation?: { id?: number } };
      const convId = where?.conversation?.id;
      return messages
        .filter((msg) => msg.conversation?.id === convId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },
  };

  const followRepository = {
    find: async (options: Record<string, unknown>) =>
      findFollows(options.where),
    findOne: async (options: Record<string, unknown>) =>
      findFollows(options.where)[0] ?? null,
  };

  const manager = {
    createQueryBuilder: () => {
      let lockedIds: number[] = [];
      const qb = {
        setLock: () => qb,
        where: (_sql: string, params?: { orderedIds?: number[] }) => {
          lockedIds = params?.orderedIds ?? [];
          return qb;
        },
        getMany: async () =>
          lockedIds
            .map((id) => members.get(id))
            .filter((row): row is UserMimateEntity => Boolean(row)),
      };
      return qb;
    },
    findOne: async (entity: unknown, options: Record<string, unknown>) => {
      if (entity === UserFollowEntity) {
        return followRepository.findOne(options);
      }
      return null;
    },
    getRepository: (entity: unknown) => {
      if (entity === Conversation) {
        return conversationRepository;
      }
      return null;
    },
  };

  const userMimateRepository = {
    manager: {
      transaction: async <T>(cb: (em: typeof manager) => Promise<T>) =>
        cb(manager),
    },
  };

  const service = new DirectMessageService(
    messageRepository as never,
    conversationRepository as never,
    userMimateRepository as never,
    followRepository as never,
    new DateHelper(),
  );

  /** Marks two members as accepted mutual friends in the test store. */
  function addAcceptedFriendship(memberA: number, memberB: number): void {
    const follow = new UserFollowEntity();
    follow.id = follows.length + 1;
    follow.followerId = memberA;
    follow.followingId = memberB;
    follow.status = 'accepted';
    follows.push(follow);
  }

  return {
    service,
    members,
    follows,
    conversations,
    messages,
    addAcceptedFriendship,
  };
}

describe('DirectMessage DTO validation', () => {
  it('validates FindOrCreateConversationDto and ConversationIdParamDto bounds', async () => {
    const validTarget = plainToInstance(FindOrCreateConversationDto, {
      memberId: '42',
    });
    expect(await validate(validTarget)).toHaveLength(0);

    const invalidTarget = plainToInstance(FindOrCreateConversationDto, {
      memberId: '0',
    });
    expect((await validate(invalidTarget)).length).toBeGreaterThan(0);

    const validConv = plainToInstance(ConversationIdParamDto, {
      conversationId: '15',
    });
    expect(await validate(validConv)).toHaveLength(0);

    const invalidConv = plainToInstance(ConversationIdParamDto, {
      conversationId: '-3',
    });
    expect((await validate(invalidConv)).length).toBeGreaterThan(0);
  });

  it('trims SendMessageDto content and rejects blank or oversized messages', async () => {
    const validMsg = plainToInstance(SendMessageDto, {
      content: '  Halo apa kabar?  ',
    });
    expect(await validate(validMsg)).toHaveLength(0);
    expect(validMsg.content).toBe('Halo apa kabar?');

    const blankMsg = plainToInstance(SendMessageDto, {
      content: '   ',
    });
    expect((await validate(blankMsg)).length).toBeGreaterThan(0);

    const oversizedMsg = plainToInstance(SendMessageDto, {
      content: 'a'.repeat(2001),
    });
    expect((await validate(oversizedMsg)).length).toBeGreaterThan(0);
  });

  it('trims DmSearchDto and enforces maximum length', async () => {
    const validSearch = plainToInstance(DmSearchDto, {
      search: '  Sarah  ',
    });
    expect(await validate(validSearch)).toHaveLength(0);
    expect(validSearch.search).toBe('Sarah');

    const oversizedSearch = plainToInstance(DmSearchDto, {
      search: 'x'.repeat(101),
    });
    expect((await validate(oversizedSearch)).length).toBeGreaterThan(0);
  });
});

describe('DirectMessageService (1-on-1 Chat)', () => {
  it('rejects starting a conversation with oneself', async () => {
    const { service } = createDirectMessageHarness();
    await expect(service.findOrCreateConversation(1, 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects starting a conversation when members are not accepted friends (CHAT-001)', async () => {
    const { service } = createDirectMessageHarness();
    await expect(service.openMemberChatWithFriend(1, 2)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('creates a single conversation for accepted friends and reuses it on subsequent calls', async () => {
    const { service, addAcceptedFriendship, conversations } =
      createDirectMessageHarness();
    addAcceptedFriendship(1, 2);

    const firstOpen = await service.openMemberChatWithFriend(1, 2);
    const secondOpen = await service.openMemberChatWithFriend(2, 1);

    expect(firstOpen.conversationId).toBe(secondOpen.conversationId);
    expect(conversations).toHaveLength(1);
    expect(firstOpen.partner.id).toBe(2);
    expect(firstOpen.partner.name).toBe('Sarah Kim');
    expect(firstOpen.topics.length).toBeGreaterThanOrEqual(4);
    const hobiTopic = firstOpen.topics.find((item) => item.type === 'hobi');
    expect(hobiTopic?.subPrompt).toContain('Musik');
  });

  it('sends messages, updates thread list unread count, and marks messages read on room open', async () => {
    const { service, addAcceptedFriendship } = createDirectMessageHarness();
    addAcceptedFriendship(1, 2);

    const room = await service.openMemberChatWithFriend(1, 2);
    const sent = await service.sendMemberChatMessage(
      1,
      room.conversationId,
      'Halo Sarah, lagi sibuk nggak?',
    );

    expect(sent.text).toBe('Halo Sarah, lagi sibuk nggak?');
    expect(sent.sender).toBe('user');
    expect(sent.senderId).toBe(1);

    // Member 2 sees 1 unread message in thread list
    const member2ThreadsBeforeRead = await service.listMemberChatThreads(2);
    expect(member2ThreadsBeforeRead.items).toHaveLength(1);
    expect(member2ThreadsBeforeRead.items[0].unreadCount).toBe(1);
    expect(member2ThreadsBeforeRead.items[0].lastMessage).toBe(
      'Halo Sarah, lagi sibuk nggak?',
    );

    // Member 2 opens the room -> marks incoming message as read
    const member2Room = await service.getMemberChatRoom(2, room.conversationId);
    expect(member2Room.messages).toHaveLength(1);
    expect(member2Room.messages[0].sender).toBe('other');

    const member2ThreadsAfterRead = await service.listMemberChatThreads(2);
    expect(member2ThreadsAfterRead.items[0].unreadCount).toBe(0);
  });

  it('forbids non-participants from reading, sending, or deleting a conversation', async () => {
    const { service, addAcceptedFriendship } = createDirectMessageHarness();
    addAcceptedFriendship(1, 2);
    addAcceptedFriendship(1, 3);

    const room = await service.openMemberChatWithFriend(1, 2);

    await expect(
      service.getMemberChatRoom(3, room.conversationId),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      service.sendMemberChatMessage(3, room.conversationId, 'Ikut nimbrung'),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      service.softDeleteConversationById(room.conversationId, 3),
    ).rejects.toThrow(ForbiddenException);

    await expect(service.getMemberChatRoom(1, 9999)).rejects.toThrow(
      NotFoundException,
    );
  });
});
