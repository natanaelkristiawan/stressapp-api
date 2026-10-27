import { createHash, randomUUID } from 'crypto';
import { ContentModerationService } from '../content-moderation/content-moderation.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from 'src/entity/convertation.entity';
import { Message } from 'src/entity/message.entity';
import { UserFollowEntity } from 'src/entity/user-follow.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { EntityManager, In, Repository } from 'typeorm';
import {
  ChatMessageItemInterface,
  ChatPartnerInterface,
  ChatRoomDetailInterface,
  ChatThreadItemInterface,
  ChatThreadListInterface,
  ChatTopicCardInterface,
  Conversation as ConversationInterface,
  GetConversationHistory,
  GetMessage,
  History as HistoryInterface,
} from './interfaces/direct-message.interface';
import { DateHelper } from 'src/common/helpers/date.helper';

const DEFAULT_CHAT_TOPICS: ChatTopicCardInterface[] = [
  {
    id: 'topic-kuliner',
    title: 'Kuliner',
    color: '#5B7C28',
    textColor: '#E6F34C',
    prompt: 'Bahas makanan enak di sekitar atau tempat nongkrong favorit.',
    subPrompt:
      'Kamu punya rekomendasi kafe atau kuliner yang wajib dicoba di sekitarmu?',
    type: 'kuliner',
  },
  {
    id: 'topic-hobi',
    title: 'Hobi & Minat',
    color: '#2B6CB0',
    textColor: '#E0F2FE',
    prompt:
      'Ceritakan hobi baru atau kegiatan seru yang lagi sering kamu lakuin.',
    subPrompt:
      'Lagi suka dengerin musik apa, atau ada buku/game yang lagi seru?',
    type: 'hobi',
  },
  {
    id: 'topic-film',
    title: 'Film & Serial',
    color: '#7C3AED',
    textColor: '#FDE047',
    prompt:
      'Tanya rekomendasi film atau serial favorit yang seru ditonton akhir pekan.',
    subPrompt: 'Ada tontonan Netflix atau bioskop yang menurutmu seru banget?',
    type: 'film',
  },
  {
    id: 'topic-keseharian',
    title: 'Keseharian',
    color: '#D97706',
    textColor: '#FEF3C7',
    prompt: 'Ceritakan momen seru atau hal menarik yang kamu alami minggu ini.',
    subPrompt: 'Gimana harimu hari ini? Ada cerita lucu atau berkesan nggak?',
    type: 'keseharian',
  },
];

@Injectable()
export class DirectMessageService {
  constructor(
    @InjectRepository(Message, 'mimate')
    private readonly messageRepository: Repository<Message>,

    @InjectRepository(Conversation, 'mimate')
    private readonly conversationRepository: Repository<Conversation>,

    @InjectRepository(UserMimateEntity, 'mimate')
    private readonly userMimateRepository: Repository<UserMimateEntity>,

    @InjectRepository(UserFollowEntity, 'mimate')
    private readonly followRepository: Repository<UserFollowEntity>,

    private readonly dateHelper: DateHelper,
    private readonly moderation: ContentModerationService,
  ) {}

  /** Formats a member display name with fallback when name is empty.
   * @returns Formatted display name.
   */
  private getMemberName(
    name: string,
    mmid_fullname: string,
    id: number,
  ): string {
    let tempName = name;
    if (!tempName || tempName.trim() === '') {
      tempName = mmid_fullname;
    }
    if (!tempName || tempName.trim() === '') {
      tempName = `user_${String(id).padStart(4, '0')}`;
    }

    return tempName
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /** Formats a public @username handle for a member.
   * @returns Normalized @username handle.
   */
  private formatMemberUsername(member: UserMimateEntity): string {
    const rawUsername =
      typeof member.username === 'string' ? member.username.trim() : '';
    if (rawUsername) {
      return rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;
    }
    const emailPrefix =
      typeof member.email === 'string' && member.email.includes('@')
        ? member.email.split('@')[0].trim()
        : '';
    if (emailPrefix) {
      return `@${emailPrefix.toLowerCase().replace(/[^a-z0-9._]/g, '_')}`;
    }
    return `@user_${member.id}`;
  }

  /** Extracts normalized preference labels from a member's preferences array or hobby string.
   * @returns Array of preference strings.
   */
  private extractPreferences(member?: UserMimateEntity): string[] {
    if (!member) {
      return [];
    }
    if (Array.isArray(member.preferences) && member.preferences.length > 0) {
      return member.preferences
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0);
    }
    if (typeof member.hobby === 'string' && member.hobby.trim().length > 0) {
      return member.hobby
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
    return [];
  }

  /** Maps a UserMimateEntity into a safe ChatPartnerInterface object.
   * @returns ChatPartnerInterface.
   */
  private formatPartner(member: UserMimateEntity): ChatPartnerInterface {
    const location =
      typeof member.location === 'string' && member.location.trim().length > 0
        ? member.location.trim()
        : typeof member.address === 'string' && member.address.trim().length > 0
        ? member.address.trim()
        : 'Jakarta';

    return {
      id: member.id,
      name: this.getMemberName(member.name, member.mmid_fullname, member.id),
      username: this.formatMemberUsername(member),
      avatarUrl: member.profilePictureUrl ? member.profilePictureUrl : '',
      location,
      preferences: this.extractPreferences(member),
    };
  }

  /** Builds conversation topic cards personalized with shared or partner preferences when present.
   * @returns Array of ChatTopicCardInterface items.
   */
  private buildTopicsForParticipants(
    selfMember: UserMimateEntity | undefined,
    partnerMember: UserMimateEntity,
  ): ChatTopicCardInterface[] {
    const selfPrefs = this.extractPreferences(selfMember);
    const partnerPrefs = this.extractPreferences(partnerMember);
    const sharedPrefs = partnerPrefs.filter((pref) =>
      selfPrefs.some((own) => own.toLowerCase() === pref.toLowerCase()),
    );
    const highlightedPrefs =
      sharedPrefs.length > 0 ? sharedPrefs : partnerPrefs;
    const partnerFirstName = this.getMemberName(
      partnerMember.name,
      partnerMember.mmid_fullname,
      partnerMember.id,
    ).split(' ')[0];

    return DEFAULT_CHAT_TOPICS.map((topic) => {
      if (topic.type === 'hobi' && highlightedPrefs.length > 0) {
        const topList = highlightedPrefs.slice(0, 3).join(', ');
        const prefix =
          sharedPrefs.length > 0
            ? `Kalian sama-sama suka ${topList}!`
            : `${partnerFirstName} tertarik dengan ${topList}.`;
        return {
          ...topic,
          prompt: `Ngobrol seputar hobi ${topList} yang seru untuk dibahas bareng.`,
          subPrompt: `${prefix} Tanyakan pengalaman serunya!`,
        };
      }
      return { ...topic };
    });
  }

  /** Formats a UTC Date into HH:mm string.
   * @returns 24-hour time string in UTC.
   */
  private formatUtcTime(dateInput: Date | string): string {
    const dateObj = new Date(dateInput);
    return dateObj.toLocaleTimeString('en-US', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  /** Checks whether two members have an accepted mutual friendship in user_follows.
   * @returns True when an accepted friendship exists between member1Id and member2Id.
   */
  private async hasAcceptedFriendship(
    member1Id: number,
    member2Id: number,
    manager?: EntityManager,
  ): Promise<boolean> {
    const whereClause = [
      {
        followerId: member1Id,
        followingId: member2Id,
        status: 'accepted' as const,
      },
      {
        followerId: member2Id,
        followingId: member1Id,
        status: 'accepted' as const,
      },
    ];
    const row = manager
      ? await manager.findOne(UserFollowEntity, { where: whereClause })
      : await this.followRepository.findOne({ where: whereClause });
    return Boolean(row);
  }

  /** Finds an existing 1-on-1 conversation between two members using participant rows.
   * @returns Matching Conversation with participants or null.
   */
  private async findExistingPairConversation(
    member1Id: number,
    member2Id: number,
    manager?: EntityManager,
  ): Promise<Conversation | null> {
    const repo = manager
      ? manager.getRepository(Conversation)
      : this.conversationRepository;

    const member1Convos = await repo.find({
      where: {
        participants: {
          id: member1Id,
        },
      },
      select: ['id'],
    });

    if (member1Convos.length === 0) {
      return null;
    }

    const candidateIds = member1Convos.map((convo) => convo.id);
    const candidates = await repo.find({
      where: {
        id: In(candidateIds),
      },
      relations: ['participants'],
      order: {
        updatedAt: 'DESC',
        id: 'DESC',
      },
    });

    const targetIds = [member1Id, member2Id].sort((a, b) => a - b);
    const matched = candidates.find((convo) => {
      if (!Array.isArray(convo.participants)) {
        return false;
      }
      const participantIds = convo.participants
        .map((participant) => participant.id)
        .sort((a, b) => a - b);
      return (
        participantIds.length === 2 &&
        participantIds[0] === targetIds[0] &&
        participantIds[1] === targetIds[1]
      );
    });

    return matched ?? null;
  }

  /** Finds or creates a 1-on-1 conversation between two accepted friends with row locking.
   * @returns ConversationInterface for the member pair.
   */
  async findOrCreateConversation(
    member1Id: number,
    member2Id: number,
  ): Promise<ConversationInterface> {
    if (member1Id === member2Id) {
      throw new BadRequestException(
        'Tidak dapat memulai obrolan dengan diri sendiri.',
      );
    }

    const orderedIds = [member1Id, member2Id].sort((a, b) => a - b);

    return this.userMimateRepository.manager.transaction(async (manager) => {
      const lockedMembers = await manager
        .createQueryBuilder(UserMimateEntity, 'member')
        .setLock('pessimistic_write')
        .where('member.id IN (:...orderedIds)', { orderedIds })
        .getMany();

      const member1 = lockedMembers.find((item) => item.id === member1Id);
      const member2 = lockedMembers.find((item) => item.id === member2Id);

      if (
        !member1 ||
        member1.deleted_at ||
        member1.is_suspended ||
        !member2 ||
        member2.deleted_at ||
        member2.is_suspended
      ) {
        throw new NotFoundException('Pengguna tidak ditemukan.');
      }

      const areFriends = await this.hasAcceptedFriendship(
        member1Id,
        member2Id,
        manager,
      );
      if (!areFriends) {
        throw new ForbiddenException(
          'Anda hanya dapat mengirim pesan kepada teman yang sudah terkoneksi.',
        );
      }

      const existing = await this.findExistingPairConversation(
        member1Id,
        member2Id,
        manager,
      );

      if (existing) {
        return {
          id: existing.id,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
          participants: existing.participants.map((participant) => ({
            id: participant.id,
            name: this.getMemberName(
              participant.name,
              participant.mmid_fullname,
              participant.id,
            ),
            profilePictureUrl: participant.profilePictureUrl
              ? participant.profilePictureUrl
              : '',
            isOwner: participant.id === member1Id,
          })),
        };
      }

      const repo = manager.getRepository(Conversation);
      const newConversation = repo.create({
        participants: [member1, member2],
      });
      const saved = await repo.save(newConversation);

      return {
        id: saved.id,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
        participants: saved.participants.map((participant) => ({
          id: participant.id,
          name: this.getMemberName(
            participant.name,
            participant.mmid_fullname,
            participant.id,
          ),
          profilePictureUrl: participant?.profilePictureUrl
            ? participant.profilePictureUrl
            : '',
          isOwner: participant.id === member1Id,
        })),
      };
    });
  }

  /** Converts a YYYY-MM-DD date string into Indonesian long date format.
   * @returns Formatted date string.
   */
  formatDate(date: string): string {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('id-ID', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /** Sends a text message inside an existing conversation after verifying participation and friendship.
   * @returns Saved GetMessage record.
   */
  async sendMessage(
    conversationId: number,
    senderId: number,
    content: string,
    requestId: string = randomUUID(),
  ): Promise<GetMessage> {
    const trimmedContent = typeof content === 'string' ? content.trim() : '';
    if (!trimmedContent || trimmedContent.length > 2000) {
      throw new BadRequestException('Pesan harus berisi 1–2000 karakter.');
    }
    if (
      typeof requestId !== 'string' ||
      !/^[A-Za-z0-9_-]{16,100}$/.test(requestId)
    ) {
      throw new BadRequestException('Identitas pesan tidak valid.');
    }
    const requestKey = createHash('sha256')
      .update(`${conversationId}:${senderId}:${requestId}`)
      .digest('hex');
    const { sender } = await this.getSendContext(conversationId, senderId);
    const existing = await this.messageRepository.findOne({
      where: { requestKey },
    });
    if (existing && existing.content !== trimmedContent) {
      throw new ConflictException(
        'Identitas pesan sudah dipakai untuk teks lain.',
      );
    }
    if (!existing) {
      await this.moderation.assertChatPublishable(trimmedContent, senderId);
    }

    // Recheck authorization after AI/network latency; serialize sends, reads and deletion.
    const response = await this.conversationRepository.manager.transaction(
      async (manager) => {
        const { conversation, sender: currentSender } =
          await this.getSendContext(conversationId, senderId, manager);
        const messageRepository = manager.getRepository(Message);
        const replay = await messageRepository.findOne({
          where: { requestKey },
        });
        if (replay) {
          if (replay.content !== trimmedContent) {
            throw new ConflictException(
              'Identitas pesan sudah dipakai untuk teks lain.',
            );
          }
          return replay;
        }
        const now = new Date();
        const message = messageRepository.create({
          conversation,
          sender: currentSender,
          content: trimmedContent,
          requestKey,
          createdAt: now,
        });
        const saved = await messageRepository.save(message);
        await manager
          .getRepository(Conversation)
          .update({ id: conversationId }, { updatedAt: now });
        return saved;
      },
    );

    const messageTime = new Date(response.createdAt);

    return {
      id: response.id,
      content: response.content,
      createdAt: response.createdAt,
      time: this.formatUtcTime(messageTime),
      date: this.formatDate(messageTime.toISOString().split('T')[0]),
      sender: {
        id: sender.id,
        name: this.getMemberName(sender.name, sender.mmid_fullname, sender.id),
        profilePictureUrl: sender.profilePictureUrl
          ? sender.profilePictureUrl
          : '',
        isOwner: true,
      },
    };
  }

  /** Authorizes sending before moderation and again inside the short commit transaction. */
  private async getSendContext(
    conversationId: number,
    senderId: number,
    manager?: EntityManager,
  ): Promise<{ conversation: Conversation; sender: UserMimateEntity }> {
    const repository = manager
      ? manager.getRepository(Conversation)
      : this.conversationRepository;
    const conversation = await repository.findOne({
      where: { id: conversationId },
      relations: ['participants'],
      ...(manager ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!conversation) {
      throw new NotFoundException('Percakapan tidak ditemukan.');
    }
    const sender = conversation.participants.find(
      (member) => member.id === senderId,
    );
    const recipient = conversation.participants.find(
      (member) => member.id !== senderId,
    );
    if (!sender || sender.deleted_at || sender.is_suspended) {
      throw new ForbiddenException(
        'Anda bukan peserta aktif dalam percakapan ini.',
      );
    }
    if (!recipient || recipient.deleted_at || recipient.is_suspended) {
      throw new ForbiddenException('Penerima pesan tidak tersedia.');
    }
    if (!(await this.hasAcceptedFriendship(senderId, recipient.id, manager))) {
      throw new ForbiddenException(
        'Anda hanya dapat mengirim pesan kepada teman yang sudah terkoneksi.',
      );
    }
    return { conversation, sender };
  }

  /** Loads grouped message history for a conversation after verifying participant membership.
   * @returns GetConversationHistory.
   */
  async getMessagesByConversationId(
    conversationId: number,
    userId: number,
  ): Promise<GetConversationHistory> {
    const imParticipants = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participants'],
    });

    if (!imParticipants) {
      throw new NotFoundException('Percakapan tidak ditemukan.');
    }

    if (
      !imParticipants.participants.some(
        (participant) => participant.id === userId,
      )
    ) {
      throw new ForbiddenException('Anda bukan peserta dalam percakapan ini.');
    }

    const recipient = imParticipants.participants.find(
      (participant) => participant.id !== userId,
    );
    const sender = imParticipants.participants.find(
      (participant) => participant.id === userId,
    );

    if (!recipient || !sender) {
      throw new NotFoundException('Peserta percakapan tidak ditemukan.');
    }

    const messages = await this.messageRepository.find({
      where: { conversation: { id: conversationId } },
      order: { createdAt: 'ASC', id: 'ASC' },
      relations: ['sender'],
    });

    const results: GetMessage[] = messages.map((msg) => {
      const messageTime = new Date(msg.createdAt);

      return {
        id: msg.id,
        content: msg.content,
        createdAt: messageTime,
        time: this.formatUtcTime(messageTime),
        date: this.formatDate(messageTime.toISOString().split('T')[0]),
        sender: {
          isOwner: msg.sender.id === userId,
          id: msg.sender.id,
          name: this.getMemberName(
            msg.sender.name,
            msg.sender.mmid_fullname,
            msg.sender.id,
          ),
          profilePictureUrl: msg.sender.profilePictureUrl
            ? msg.sender.profilePictureUrl
            : '',
        },
      };
    });

    const groupedMessages = results.reduce<Record<string, GetMessage[]>>(
      (acc, msg) => {
        const date = msg.date;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(msg);
        return acc;
      },
      {},
    );

    const history = Object.entries(groupedMessages).map(([date, group]) => ({
      date,
      messages: group,
    }));

    let senderSeenAtFormatted = '';
    if (sender.last_seen_at) {
      senderSeenAtFormatted = this.dateHelper.getDateRange(
        sender.last_seen_at,
        new Date(),
      );
    }

    let recipientSeenAtFormatted = '';
    if (recipient.last_seen_at) {
      recipientSeenAtFormatted = this.dateHelper.getDateRange(
        recipient.last_seen_at,
        new Date(),
      );
    }

    return {
      id: conversationId,
      sender: {
        id: userId,
        name: this.getMemberName(sender.name, sender.mmid_fullname, sender.id),
        profilePictureUrl: sender?.profilePictureUrl
          ? sender.profilePictureUrl
          : '',
        isOwner: sender.id === userId,
        lastSeenAt: sender.last_seen_at ? sender.last_seen_at : '',
        lastSeenAtTitle: senderSeenAtFormatted,
        date: sender.last_seen_at
          ? this.formatDate(
              new Date(sender.last_seen_at).toISOString().split('T')[0],
            )
          : '',
        time: sender.last_seen_at
          ? this.formatUtcTime(sender.last_seen_at)
          : '',
      },
      receiver: {
        id: recipient.id,
        name: this.getMemberName(
          recipient.name,
          recipient.mmid_fullname,
          recipient.id,
        ),
        profilePictureUrl: recipient?.profilePictureUrl
          ? recipient.profilePictureUrl
          : '',
        isOwner: recipient.id === userId,
        lastSeenAt: recipient.last_seen_at ? recipient.last_seen_at : '',
        lastSeenAtTitle: recipientSeenAtFormatted,
        date: recipient.last_seen_at
          ? this.formatDate(
              new Date(recipient.last_seen_at).toISOString().split('T')[0],
            )
          : '',
        time: recipient.last_seen_at
          ? this.formatUtcTime(recipient.last_seen_at)
          : '',
      },
      history,
    };
  }

  /** Lists conversation summaries for a user (legacy DirectMessageController format).
   * @returns Array of HistoryInterface items.
   */
  async getUserConversationList(
    userId: number,
    search?: string,
  ): Promise<HistoryInterface[]> {
    const query = await this.conversationRepository.find({
      where: {
        participants: {
          id: userId,
        },
      },
      select: ['id'],
    });

    if (query.length === 0) {
      return [];
    }

    const conversationIds = query.map((element) => element.id);
    let conversations = await this.conversationRepository.find({
      where: {
        id: In(conversationIds),
      },
      relations: ['participants', 'messages'],
    });

    if (search !== undefined && search.trim() !== '') {
      const normalizedSearch = search.trim().toLowerCase();
      conversations = conversations.filter((convo) => {
        return convo.participants.some((participant) => {
          if (participant.id === userId) {
            return false;
          }
          const displayName = this.getMemberName(
            participant.name,
            participant.mmid_fullname,
            participant.id,
          );
          return displayName.toLowerCase().includes(normalizedSearch);
        });
      });
    }

    const results: HistoryInterface[] = [];

    for (const convo of conversations) {
      const partner = convo.participants.find(
        (participant) => participant.id !== userId,
      );
      if (!partner || partner.deleted_at) {
        continue;
      }

      const formatSender = {
        id: partner.id,
        name: this.getMemberName(
          partner.name,
          partner.mmid_fullname,
          partner.id,
        ),
        profilePictureUrl: partner?.profilePictureUrl
          ? partner.profilePictureUrl
          : '',
        isOwner: false,
      };

      const unreadCount = await this.countUnreadFromSender(
        convo.id,
        partner.id,
        userId,
      );

      const lastMessage = [...(convo.messages ?? [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];

      if (!lastMessage) {
        continue;
      }

      const lastMessageTime = new Date(lastMessage.createdAt);

      results.push({
        id: convo.id,
        sender: formatSender,
        lastMessage: lastMessage.content,
        lastMessageAt: lastMessage.createdAt,
        time: this.formatUtcTime(lastMessageTime),
        date: this.formatDate(lastMessageTime.toISOString().split('T')[0]),
        unreadCount,
      });
    }

    results.sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return timeB - timeA;
    });

    return results;
  }

  /** Lists chat threads for the authenticated member on /me/chats.
   * @returns ChatThreadListInterface ordered by latest activity descending.
   */
  async listMemberChatThreads(
    userId: number,
    search?: string,
  ): Promise<ChatThreadListInterface> {
    const memberConvoRows = await this.conversationRepository.find({
      where: {
        participants: {
          id: userId,
        },
      },
      select: ['id'],
    });

    if (memberConvoRows.length === 0) {
      return { items: [] };
    }

    const conversationIds = memberConvoRows.map((row) => row.id);
    const [conversations, acceptedFollows] = await Promise.all([
      this.conversationRepository.find({
        where: {
          id: In(conversationIds),
        },
        relations: ['participants', 'messages'],
      }),
      this.followRepository.find({
        where: [
          { followerId: userId, status: 'accepted' },
          { followingId: userId, status: 'accepted' },
        ],
      }),
    ]);

    const acceptedPartnerIds = new Set<number>();
    for (const row of acceptedFollows) {
      const otherId =
        row.followerId === userId ? row.followingId : row.followerId;
      if (typeof otherId === 'number' && otherId > 0) {
        acceptedPartnerIds.add(otherId);
      }
    }

    const normalizedSearch =
      typeof search === 'string' && search.trim().length > 0
        ? search.trim().toLowerCase()
        : '';

    const itemsWithSortTime: Array<{
      item: ChatThreadItemInterface;
      sortTimeMs: number;
    }> = [];

    for (const convo of conversations) {
      const partner = convo.participants?.find(
        (participant) => participant.id !== userId,
      );
      if (!partner || partner.deleted_at || partner.is_suspended) {
        continue;
      }

      const partnerInfo = this.formatPartner(partner);
      const sortedMessages = [...(convo.messages ?? [])].sort((a, b) => {
        const diff =
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (diff !== 0) {
          return diff;
        }
        return b.id - a.id;
      });

      const latestMessage = sortedMessages[0];
      const lastMessageText = latestMessage
        ? latestMessage.content
        : 'Mulai obrolan dengan temanmu';
      const referenceDate =
        latestMessage?.createdAt ?? convo.updatedAt ?? convo.createdAt;
      const sortTimeMs = referenceDate ? new Date(referenceDate).getTime() : 0;

      if (normalizedSearch) {
        const matchesName = partnerInfo.name
          .toLowerCase()
          .includes(normalizedSearch);
        const matchesUsername = partnerInfo.username
          .toLowerCase()
          .includes(normalizedSearch);
        const matchesMessage = lastMessageText
          .toLowerCase()
          .includes(normalizedSearch);
        if (!matchesName && !matchesUsername && !matchesMessage) {
          continue;
        }
      }

      const unreadCount = await this.countUnreadFromSender(
        convo.id,
        partner.id,
        userId,
      );

      itemsWithSortTime.push({
        sortTimeMs,
        item: {
          id: String(convo.id),
          conversationId: convo.id,
          partnerId: partnerInfo.id,
          name: partnerInfo.name,
          username: partnerInfo.username,
          avatarUrl: partnerInfo.avatarUrl,
          lastMessage: lastMessageText,
          lastMessageAt: latestMessage?.createdAt
            ? new Date(latestMessage.createdAt).toISOString()
            : null,
          time: referenceDate ? this.formatUtcTime(referenceDate) : '',
          unreadCount,
          isFriend: acceptedPartnerIds.has(partnerInfo.id),
        },
      });
    }

    itemsWithSortTime.sort((a, b) => {
      if (b.sortTimeMs !== a.sortTimeMs) {
        return b.sortTimeMs - a.sortTimeMs;
      }
      return b.item.conversationId - a.item.conversationId;
    });

    return {
      items: itemsWithSortTime.map((entry) => entry.item),
    };
  }

  /** Finds or creates a conversation with an accepted friend and returns the full chat room detail.
   * @returns ChatRoomDetailInterface.
   */
  async openMemberChatWithFriend(
    userId: number,
    friendMemberId: number,
  ): Promise<ChatRoomDetailInterface> {
    const conversation = await this.findOrCreateConversation(
      userId,
      friendMemberId,
    );
    return this.getMemberChatRoom(userId, conversation.id);
  }

  /** Loads a conversation's partner profile, friendship status, messages, and topic cards for a participant.
   * @returns ChatRoomDetailInterface.
   */
  async getMemberChatRoom(
    userId: number,
    conversationId: number,
  ): Promise<ChatRoomDetailInterface> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participants'],
    });

    if (!conversation) {
      throw new NotFoundException('Percakapan tidak ditemukan.');
    }

    const selfMember = conversation.participants?.find(
      (participant) => participant.id === userId,
    );
    if (!selfMember) {
      throw new ForbiddenException('Anda bukan peserta dalam percakapan ini.');
    }

    const partnerMember = conversation.participants?.find(
      (participant) => participant.id !== userId,
    );
    if (!partnerMember || partnerMember.deleted_at) {
      throw new NotFoundException('Peserta percakapan tidak ditemukan.');
    }

    await this.markMessagesAsRead(conversationId, userId);

    const [messages, isFriend] = await Promise.all([
      this.messageRepository.find({
        where: { conversation: { id: conversationId } },
        order: { createdAt: 'ASC', id: 'ASC' },
        relations: ['sender'],
      }),
      this.hasAcceptedFriendship(userId, partnerMember.id),
    ]);

    const formattedMessages: ChatMessageItemInterface[] = messages.map(
      (msg) => {
        const createdAtDate = new Date(msg.createdAt);
        const senderId = msg.sender?.id ?? 0;
        return {
          id: String(msg.id),
          messageId: msg.id,
          sender: senderId === userId ? 'user' : 'other',
          senderId,
          text: msg.content,
          time: this.formatUtcTime(createdAtDate),
          createdAt: createdAtDate.toISOString(),
        };
      },
    );

    return {
      conversationId: conversation.id,
      partner: this.formatPartner(partnerMember),
      isFriend:
        isFriend && !partnerMember.is_suspended && !partnerMember.deleted_at,
      messages: formattedMessages,
      topics: this.buildTopicsForParticipants(selfMember, partnerMember),
    };
  }

  /** Sends a message in a member chat room and returns the formatted ChatMessageItemInterface.
   * @returns ChatMessageItemInterface.
   */
  async sendMemberChatMessage(
    userId: number,
    conversationId: number,
    content: string,
    requestId: string = randomUUID(),
  ): Promise<ChatMessageItemInterface> {
    const saved = await this.sendMessage(
      conversationId,
      userId,
      content,
      requestId,
    );
    const createdAtDate = new Date(saved.createdAt);
    return {
      id: String(saved.id),
      messageId: saved.id,
      sender: 'user',
      senderId: userId,
      text: saved.content,
      time: saved.time,
      createdAt: createdAtDate.toISOString(),
    };
  }

  /** Soft-deletes a conversation after checking participant authorization.
   * @returns Promise<void>.
   */
  async softDeleteConversationById(
    conversationId: number,
    userId: number,
  ): Promise<void> {
    await this.conversationRepository.manager.transaction(async (manager) => {
      const conversation = await manager.getRepository(Conversation).findOne({
        where: { id: conversationId },
        relations: ['participants'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!conversation) {
        throw new NotFoundException(
          `Conversation with ID ${conversationId} not found`,
        );
      }

      const isParticipant = conversation.participants.some(
        (user) => user.id === userId,
      );
      if (!isParticipant) {
        throw new ForbiddenException(
          'You are not a participant of this conversation',
        );
      }

      await manager.getRepository(Conversation).softDelete(conversationId);
    });
  }

  /** Counts unread messages sent by partnerId to userId in a conversation.
   * @returns Unread message count.
   */
  private async countUnreadFromSender(
    conversationId: number,
    partnerId: number,
    userId: number,
  ): Promise<number> {
    return this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.readBy', 'reader')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.senderId = :senderId', { senderId: partnerId })
      .andWhere((qb) => {
        const sub = qb
          .subQuery()
          .select('mr.message_id')
          .from('message_reads', 'mr')
          .where('mr.user_id = :userId')
          .getQuery();
        return 'message.id NOT IN ' + sub;
      })
      .setParameter('userId', userId)
      .getCount();
  }

  /** Marks all unread messages from the other participant in a conversation as read by userId.
   * @returns Promise<void>.
   */
  async markMessagesAsRead(
    conversationId: number,
    userId: number,
  ): Promise<void> {
    await this.conversationRepository.manager.transaction(async (manager) => {
      const conversation = await manager.getRepository(Conversation).findOne({
        where: { id: conversationId },
        relations: ['participants'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!conversation) {
        throw new NotFoundException('Percakapan tidak ditemukan.');
      }
      if (!conversation.participants.some((member) => member.id === userId)) {
        throw new ForbiddenException(
          'Anda bukan peserta dalam percakapan ini.',
        );
      }
      const messages = await manager
        .getRepository(Message)
        .createQueryBuilder('message')
        .leftJoin('message.readBy', 'reader')
        .where('message.conversationId = :conversationId', { conversationId })
        .andWhere('message.senderId != :userId', { userId })
        .andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('message_reads.message_id')
            .from('message_reads', 'message_reads')
            .where('message_reads.user_id = :userId')
            .getQuery();
          return 'message.id NOT IN ' + subQuery;
        })
        .setParameter('userId', userId)
        .getMany();

      if (messages.length > 0) {
        for (const message of messages) {
          await manager
            .getRepository(Message)
            .createQueryBuilder()
            .relation(Message, 'readBy')
            .of(message)
            .add(userId);
        }
      }
    });
  }

  /** Counts unread messages in a conversation for userId.
   * @returns Unread message count.
   */
  async countUnreadMessages(
    conversationId: number,
    userId: number,
  ): Promise<number> {
    return this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.readBy', 'reader')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.senderId != :userId', { userId })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('message_reads.message_id')
          .from('message_reads', 'message_reads')
          .where('message_reads.user_id = :userId')
          .getQuery();
        return 'message.id NOT IN ' + subQuery;
      })
      .setParameter('userId', userId)
      .getCount();
  }
}
