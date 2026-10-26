import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { EntityManager, In, IsNull, Not, Repository } from 'typeorm';
import {
    FriendCardItemInterface,
    FriendConnectionsInterface,
    FriendDiscoverPageInterface,
    FriendMemberProfileInterface,
    FriendMutationResultInterface,
    FriendProfilePostInterface,
    FriendRelationshipState,
    MemberFollowInterface,
    MemberSelfProfileInterface,
    profile,
} from './interfaces/profile.interface';
import {
    FriendConnectionsQueryDto,
    FriendDiscoverQueryDto,
    UpdateMemberProfileDto,
} from './dtos/friends.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UserFollowEntity } from 'src/entity/user-follow.entity';
import { MemberSpaceEntity } from 'src/entity/member-spaces.entity';
import { Redis } from 'ioredis';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { DateHelper } from 'src/common/helpers/date.helper';
import { PostEntity } from 'src/entity/post.entity';
import { CommentEntity } from 'src/entity/comment.entity';
import { ReactionEntity } from 'src/entity/reaction.entity';

const DEFAULT_MEMBER_LOCATION = 'Jakarta';
const ONLINE_WINDOW_MS = 15 * 60 * 1000;


@Injectable()
export class ProfileService {
    private deeplink: string
    private redis: Redis;
    constructor(
        @InjectRepository(UserMimateEntity, 'mimate')
        private userMimateRepository: Repository<UserMimateEntity>,


        @InjectRepository(UserFollowEntity, 'mimate')
        private followRepository: Repository<UserFollowEntity>,


        @InjectRepository(MemberSpaceEntity, 'mimate')
        private memberSpaceRepository: Repository<MemberSpaceEntity>,

        @InjectRepository(PostEntity, 'mimate')
        private postRepository: Repository<PostEntity>,

        @InjectRepository(CommentEntity, 'mimate')
        private commentRepository: Repository<CommentEntity>,

        @InjectRepository(ReactionEntity, 'mimate')
        private reactionRepository: Repository<ReactionEntity>,

        private readonly redisService: RedisService,
        // date formatter
        private readonly dateHelper: DateHelper
    ) {
        this.deeplink = process.env.DEEPLINK_URL
        this.redis = this.redisService.getOrNil('default')
    }

    private getMemberName(name: string, mmid_fullname: string, id: number): string {
        let tempName = name
        if (!tempName || tempName.trim() === '') {
            tempName = mmid_fullname;
        }

        if (!tempName || tempName.trim() === '') {
            tempName = `user_${String(id).padStart(4, '0')}`;
        }

        return tempName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    // profile
    async getProfile(memberId: number, userId?: number): Promise<profile> {
        let userMimate = await this.userMimateRepository.findOne({
            where: { id: memberId },
            relations: ['questPoint']
        })

        if (!userMimate) {
            throw new NotFoundException();
        }

        let following: boolean = false


        if (userId) {
            const existing = await this.followRepository.findOne({
                where: { follower: { id: userId }, following: { id: memberId } },
            });

            if (existing) {
                following = true
            }
        }



        // spaces
        let spaces = await this.memberSpaceRepository.find({ where: { member: userMimate, space: { id: Not(15), hidden: 0 }, follow: true }, relations: ['space'] })
        let totalSpaces = spaces.length

        // format spaces
        let spacesData = []

        for (let space of spaces) {
            spacesData.push({
                id: space.space.id,
                name: space.space.name
            })
        }

        let lastSeenAtFormated = ""

        if (userMimate.last_seen_at) {
            lastSeenAtFormated = this.dateHelper.getDateRange(userMimate.last_seen_at, new Date())
        }


        let dateFormated = (date: Date): string => {

            const originalDate = new Date(date)

            const day = String(originalDate.getDate()).padStart(2, '0');
            const month = String(originalDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
            const year = originalDate.getFullYear();

            const formattedDate = `${day}/${month}/${year}`;

            return formattedDate
        }

        let name = this.getMemberName(userMimate.name, userMimate.mmid_fullname, memberId)

        let vehicleList: string[] = []

        // External vehicle enrichment is retired; retain the response field for legacy clients.

        let response: profile = {
            id: memberId,
            name: name,
            photo: userMimate.profilePictureUrl,
            email: userMimate.email,
            gender: userMimate.gender,
            dob: userMimate.dob,
            tagline: userMimate.tagline,
            bio: userMimate.bio,
            hobby: userMimate.hobby,
            link: userMimate.link,
            postCode: userMimate.post_code,
            address: userMimate.address,
            SIMExpired: userMimate.sim_expired,
            totalPosts: userMimate.total_posts,
            totalFollowers: userMimate.total_followers,
            totalFollowings: userMimate.total_followings,
            totalSpaces: totalSpaces,
            following: following,
            is_dealer: userMimate.is_dealer,
            share_url: `${this.deeplink}/deeplink/mimate?page=profile&username=${userMimate.email}&id=${memberId}`,
            spaces: spacesData,
            memberSince: dateFormated(userMimate.created_at),
            lastSeenAt: lastSeenAtFormated,
            vehicleList: vehicleList,
            // add total quest points
            mimatePoint: userMimate.questPoint?.totalPoints ?? 0,
        }


        return response

    }


    async checkProfile(memberId: number): Promise<boolean> {
        let userMimate = await this.userMimateRepository.findOneBy({ id: memberId })
        if (!userMimate) {
            throw new NotFoundException();
        }
        return true
    }

    async updateProfile(member: number, params: UpdateProfileDto, token: string): Promise<any> {
        return
    }

    async follow(followerId: number, followingId: number) {
        if (followerId === followingId) {
            throw new Error("You can't follow yourself");
        }

        const follower = await this.userMimateRepository.findOneByOrFail({ id: followerId });
        const following = await this.userMimateRepository.findOneByOrFail({ id: followingId });

        const existing = await this.followRepository.findOne({
            where: { follower: { id: followerId }, following: { id: followingId } },
        });

        if (existing) {
            throw new ForbiddenException('Already following');
        }

        // update following and followers
        let countFollowing = follower.total_followings + 1;
        await this.userMimateRepository.update({ id: followerId }, { total_followings: countFollowing })

        let countFollower = following.total_followers + 1;
        await this.userMimateRepository.update({ id: followingId }, { total_followers: countFollower })


        const follow = this.followRepository.create({ follower, following });
        return this.followRepository.save(follow);
    }

    async unfollow(followerId: number, followingId: number) {
        const existing = await this.followRepository.findOne({
            where: { follower: { id: followerId }, following: { id: followingId } },
        });

        if (!existing) {
            throw new ForbiddenException('Not following');
        }




        await this.followRepository.remove(existing);

        const follower = await this.userMimateRepository.findOneByOrFail({ id: followerId });
        const following = await this.userMimateRepository.findOneByOrFail({ id: followingId });


        // update following and followers
        let countFollowing = follower.total_followings - 1;
        await this.userMimateRepository.update({ id: followerId }, { total_followings: countFollowing })

        let countFollower = following.total_followers - 1;
        await this.userMimateRepository.update({ id: followingId }, { total_followers: countFollower })
        return { message: 'Unfollowed successfully' };
    }

    async getFollowers(userId: number) {
        return this.followRepository.find({
            where: { following: { id: userId } },
            relations: ['follower',],
        });
    }

    async getFollowing(userId: number) {
        return this.followRepository.find({
            where: { follower: { id: userId } },
            relations: ['following'],
        });
    }

    async getMemberFollowers(userId: number, memberId: number): Promise<MemberFollowInterface[]> {
        // hit get followers
        let followers = await this.getFollowers(userId)

        // get member from followers
        let members = followers.map(item => {
            let name = this.getMemberName(item.follower.name, item.follower.mmid_fullname, item.follower.id)
            return {
                memberId: item.follower.id,
                name: name,
                profilePicture: item.follower.profilePictureUrl,
                bio: item.follower.bio,
                seen: memberId == userId ? item.seen  : undefined
            }
        })

        return members
    }

    // get member following
    async getMemberFollowing(userId: number, memberId: number): Promise<MemberFollowInterface[]> {
        // hit get following
        let following = await this.getFollowing(userId)

        // get member from following
        let members = following.map(item => {
            let name = this.getMemberName(item.following.name, item.following.mmid_fullname, item.following.id)
            return {
                memberId: item.following.id,
                name: name,
                profilePicture: item.following.profilePictureUrl,
                bio: item.following.bio,
                seen: memberId == userId ? item.seen  : undefined
            }
        })

        return members
    }




    // sync profile delete cache
    async syncProfile(userId: number, authHeader: string): Promise<boolean> {

        const token = authHeader.replace('Bearer ', '').trim();
        const cacheKey = `token:${token}`;

        const cachedUser = await this.redis.get(cacheKey);

        if (cachedUser) {
            // delete cache 
            await this.redis.del(cacheKey);
        }



        return true
    }


    // calculcate posts member
    async calculatePostsMember(): Promise<boolean> {

        // get all member
        let members = await this.userMimateRepository.find()

        for (let index = 0; index < members.length; index++) {
            const member = members[index];
            // hit get posts
            let posts = await this.postRepository.find({ where: { member: { id: member.id } } })
            // update total posts
            await this.userMimateRepository.update({ id: member.id }, { total_posts: posts.length })
        }

        return true
    }

    // calculate comment member
    async calculateCommentMember(): Promise<boolean> {
        // get all member
        let members = await this.userMimateRepository.find()

        for (let index = 0; index < members.length; index++) {
            const member = members[index];
            // hit get comments
            let comments = await this.commentRepository.find({ where: { member: { id: member.id } } })
            // update total comments
            await this.userMimateRepository.update({ id: member.id }, { total_comments: comments.length })
        }

        return true

    }

    // calculate reaction member
    async calculateReactionMember(): Promise<boolean> {
        // get all member
        let members = await this.userMimateRepository.find()

        for (let index = 0; index < members.length; index++) {
            const member = members[index];
            // hit get reactions
            let reactions = await this.reactionRepository.find({ where: { member: { id: member.id } } })
            // update total reactions
            await this.userMimateRepository.update({ id: member.id }, { total_likes: reactions.length })
        }

        return true
    }

    // calculate space member
    async calculateSpaceMember(): Promise<boolean> {
        // get all member
        let members = await this.userMimateRepository.find()

        for (let index = 0; index < members.length; index++) {
            const member = members[index];
            // hit get spaces
            let spaces = await this.memberSpaceRepository.find({ where: { member: { id: member.id } } })
            // update total spaces
            await this.userMimateRepository.update({ id: member.id }, { total_spaces: spaces.length })
        }

        return true
    }

    // get all member with photoprofile
    async getAllMemberWithPhotoprofile(): Promise<any[]> {
        let members = await this.userMimateRepository.find({ where: { profilePictureUrl: Not(IsNull()) } })

        let response: any[] = members.map(item => {
            return [
                item.userId,
                item.profilePictureUrl
            ]
        })

        return response
    }

    // get detail user
    async getUserDetail(id:number):Promise<UserMimateEntity> { 
        return await this.userMimateRepository.findOneBy({id:id})
    }


    async setSeen(memberId: number) {
        await this.followRepository.update(
            { following: { id: memberId } },
            { seen: 1 },
        );
    }

    /** Checks whether a member account is active, non-suspended, and verified if mobile-enabled.
     * @returns True when the member is eligible to appear in friend discovery and connections.
     */
    private isMemberEligibleForFriends(
        member?: UserMimateEntity | null,
    ): member is UserMimateEntity {
        if (!member) {
            return false;
        }
        if (member.deleted_at) {
            return false;
        }
        if (member.is_suspended) {
            return false;
        }
        if (member.memberAuthEnabled && !member.verifiedAt) {
            return false;
        }
        return true;
    }

    /** Builds a consistent @username handle from stored username, email prefix, or display name.
     * @returns A lowercase @username string.
     */
    private getMemberUsername(member: UserMimateEntity): string {
        const storedUsername = member.username?.trim().replace(/^@+/, '');
        if (storedUsername && storedUsername.length > 0) {
            return `@${storedUsername}`;
        }

        const emailLocalPart = member.email?.split('@')[0] ?? '';
        const normalizedEmailHandle = emailLocalPart
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '');

        if (normalizedEmailHandle.length > 0) {
            return `@${normalizedEmailHandle}`;
        }

        const displayName = this.getMemberName(
            member.name,
            member.mmid_fullname,
            member.id,
        );
        const normalizedNameHandle = displayName
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '');

        if (normalizedNameHandle.length > 0) {
            return `@${normalizedNameHandle}`;
        }

        return `@user_${String(member.id).padStart(4, '0')}`;
    }

    /** Formats a member's city/location with a consistent fallback.
     * @returns Non-empty location label.
     */
    private getMemberLocation(member: UserMimateEntity): string {
        const trimmedLocation = member.location?.trim();
        if (trimmedLocation && trimmedLocation.length > 0) {
            return trimmedLocation;
        }
        const trimmedAddress = member.address?.trim();
        if (trimmedAddress && trimmedAddress.length > 0) {
            return trimmedAddress;
        }
        return DEFAULT_MEMBER_LOCATION;
    }

    /** Extracts a member's preference tags from the JSON column or legacy hobby string.
     * @returns Array of trimmed non-empty preference strings.
     */
    private getMemberPreferences(member: UserMimateEntity): string[] {
        if (Array.isArray(member.preferences)) {
            return member.preferences
                .map((item) => (typeof item === 'string' ? item.trim() : ''))
                .filter((item) => item.length > 0);
        }
        return (member.hobby ?? '')
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    }

    /** Maps a Member entity into the authenticated member's own profile response.
     * @returns MemberSelfProfileInterface for mobile profile state.
     */
    private toSelfProfile(member: UserMimateEntity): MemberSelfProfileInterface {
        return {
            id: member.id,
            name: member.name?.trim() || '',
            email: member.email || '',
            emailVerified: Boolean(member.verifiedAt),
            username: member.username?.trim() || '',
            location:
                member.location?.trim() || member.address?.trim() || '',
            bio: member.bio?.trim() || '',
            avatarUrl: member.profilePictureUrl?.trim() || '',
            preferences: this.getMemberPreferences(member),
        };
    }

    /** Loads the authenticated member's own profile from the database.
     * @returns MemberSelfProfileInterface.
     */
    async getSelfProfile(memberId: number): Promise<MemberSelfProfileInterface> {
        const member = await this.userMimateRepository.findOne({
            where: { id: memberId },
        });
        if (!this.isMemberEligibleForFriends(member)) {
            throw new NotFoundException('Profil pengguna tidak ditemukan.');
        }
        return this.toSelfProfile(member);
    }

    /** Updates the authenticated member's profile fields and preferences inside a transaction.
     * @returns Updated MemberSelfProfileInterface.
     */
    async updateSelfProfile(
        memberId: number,
        input: UpdateMemberProfileDto,
    ): Promise<MemberSelfProfileInterface> {
        try {
            return await this.userMimateRepository.manager.transaction(
                async (manager) => {
                    const lockedMembers = await manager
                        .createQueryBuilder(UserMimateEntity, 'member')
                        .setLock('pessimistic_write')
                        .where('member.id IN (:...orderedIds)', {
                            orderedIds: [memberId],
                        })
                        .getMany();

                    const member = lockedMembers.find(
                        (item) => item.id === memberId,
                    );
                    if (!this.isMemberEligibleForFriends(member)) {
                        throw new NotFoundException(
                            'Profil pengguna tidak ditemukan.',
                        );
                    }

                    if (input.name !== undefined) {
                        member.name = input.name;
                    }
                    if (input.username !== undefined) {
                        const normalizedUsername =
                            typeof input.username === 'string'
                                ? input.username.trim().replace(/^@+/, '')
                                : '';
                        member.username =
                            normalizedUsername.length > 0
                                ? normalizedUsername
                                : null;
                    }
                    if (input.location !== undefined) {
                        const normalizedLocation =
                            typeof input.location === 'string'
                                ? input.location.trim()
                                : '';
                        member.location =
                            normalizedLocation.length > 0
                                ? normalizedLocation
                                : null;
                        member.address = member.location;
                    }
                    if (input.bio !== undefined) {
                        const normalizedBio =
                            typeof input.bio === 'string'
                                ? input.bio.trim()
                                : '';
                        member.bio =
                            normalizedBio.length > 0 ? normalizedBio : null;
                    }
                    if (input.avatarUrl !== undefined) {
                        const normalizedAvatar =
                            typeof input.avatarUrl === 'string'
                                ? input.avatarUrl.trim()
                                : '';
                        member.profilePictureUrl =
                            normalizedAvatar.length > 0
                                ? normalizedAvatar
                                : null;
                    }
                    if (input.preferences !== undefined) {
                        member.preferences = input.preferences;
                        member.hobby =
                            input.preferences.length > 0
                                ? input.preferences.join(', ')
                                : null;
                    }

                    await manager.save(UserMimateEntity, member);
                    return this.toSelfProfile(member);
                },
            );
        } catch (error) {
            if (
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 'ER_DUP_ENTRY'
            ) {
                throw new ConflictException(
                    'Username sudah digunakan oleh pengguna lain.',
                );
            }
            throw error;
        }
    }

    /** Resolves a member's profile picture URL or returns an empty string when not uploaded.
     * @returns Valid HTTP/HTTPS avatar URL string or empty string.
     */
    private getMemberAvatarUrl(member: UserMimateEntity): string {
        const trimmedUrl = member.profilePictureUrl?.trim();
        if (
            trimmedUrl &&
            /^https?:\/\//i.test(trimmedUrl) &&
            !trimmedUrl.endsWith('/sample-friend.jpg')
        ) {
            return trimmedUrl;
        }
        return '';
    }

    /** Determines whether a member has been active within the recent online window.
     * @returns True when last_seen_at is within 15 minutes of current UTC time.
     */
    private isMemberOnline(member: UserMimateEntity): boolean {
        if (!member.last_seen_at) {
            return false;
        }
        const lastSeenTime = new Date(member.last_seen_at).getTime();
        if (Number.isNaN(lastSeenTime)) {
            return false;
        }
        return Date.now() - lastSeenTime <= ONLINE_WINDOW_MS;
    }

    /** Maps a UserMimateEntity and relationship state into a mobile FriendCard item.
     * @returns A FriendCardItemInterface ready for mobile rendering.
     */
    private toFriendCardItem(
        member: UserMimateEntity,
        relationshipStatus: FriendRelationshipState,
    ): FriendCardItemInterface {
        const displayName = this.getMemberName(
            member.name,
            member.mmid_fullname,
            member.id,
        );
        return {
            id: String(member.id),
            memberId: member.id,
            name: displayName,
            username: this.getMemberUsername(member),
            location: this.getMemberLocation(member),
            avatarUrl: this.getMemberAvatarUrl(member),
            isOnline: this.isMemberOnline(member),
            relationshipStatus,
        };
    }

    /** Checks whether a FriendCard item matches optional search and location filters.
     * @returns True when the card satisfies all provided filter criteria.
     */
    private matchesFriendFilter(
        card: FriendCardItemInterface,
        search?: string,
        location?: string,
    ): boolean {
        if (location) {
            const normalizedLocationFilter = location.trim().toLowerCase();
            const cardLocation = card.location.toLowerCase();
            if (!cardLocation.includes(normalizedLocationFilter)) {
                return false;
            }
        }

        if (search) {
            const normalizedSearchFilter = search.trim().toLowerCase();
            const matchesName = card.name
                .toLowerCase()
                .includes(normalizedSearchFilter);
            const matchesUsername = card.username
                .toLowerCase()
                .includes(normalizedSearchFilter);
            if (!matchesName && !matchesUsername) {
                return false;
            }
        }

        return true;
    }

    /** Resolves the friendship status between viewerId and targetMemberId from follow rows.
     * @returns One of 'self', 'accepted', 'outgoing_pending', 'incoming_pending', or 'none'.
     */
    private resolveRelationshipFromRows(
        viewerId: number,
        targetMemberId: number,
        rows: UserFollowEntity[],
    ): FriendRelationshipState {
        if (viewerId === targetMemberId) {
            return 'self';
        }

        for (const row of rows) {
            const isPair =
                (row.followerId === viewerId &&
                    row.followingId === targetMemberId) ||
                (row.followerId === targetMemberId &&
                    row.followingId === viewerId);

            if (isPair && row.status === 'accepted') {
                return 'accepted';
            }
        }

        for (const row of rows) {
            if (
                row.followerId === viewerId &&
                row.followingId === targetMemberId &&
                row.status === 'pending'
            ) {
                return 'outgoing_pending';
            }
            if (
                row.followerId === targetMemberId &&
                row.followingId === viewerId &&
                row.status === 'pending'
            ) {
                return 'incoming_pending';
            }
        }

        return 'none';
    }

    /** Synchronizes accepted friend totals on a member row inside an active transaction.
     * @returns The updated accepted connection count for the member.
     */
    private async syncAcceptedConnectionCount(
        manager: EntityManager,
        memberId: number,
    ): Promise<number> {
        const acceptedRows = await manager.find(UserFollowEntity, {
            where: [
                { followerId: memberId, status: 'accepted' },
                { followingId: memberId, status: 'accepted' },
            ],
        });

        const peerIds = new Set<number>();
        for (const row of acceptedRows) {
            const peerId =
                row.followerId === memberId ? row.followingId : row.followerId;
            if (typeof peerId === 'number' && peerId !== memberId) {
                peerIds.add(peerId);
            }
        }

        const totalConnections = peerIds.size;
        await manager.update(
            UserMimateEntity,
            { id: memberId },
            {
                total_followers: totalConnections,
                total_followings: totalConnections,
            },
        );

        return totalConnections;
    }

    /** Lists paginated discoverable members excluding self and already-accepted friends.
     * @returns Paginated FriendDiscoverPageInterface for the Temukan tab.
     */
    async discoverMembers(
        viewerId: number,
        query: FriendDiscoverQueryDto,
    ): Promise<FriendDiscoverPageInterface> {
        const page = Math.max(1, query.page ?? 1);
        const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 6));

        const viewerRows = await this.followRepository.find({
            where: [{ followerId: viewerId }, { followingId: viewerId }],
        });

        const excludedMemberIds = new Set<number>([viewerId]);
        for (const row of viewerRows) {
            if (row.status === 'accepted') {
                const peerId =
                    row.followerId === viewerId
                        ? row.followingId
                        : row.followerId;
                if (typeof peerId === 'number') {
                    excludedMemberIds.add(peerId);
                }
            }
        }

        const qb = this.userMimateRepository
            .createQueryBuilder('member')
            .where('member.deleted_at IS NULL')
            .andWhere('member.is_suspended = :isSuspended', {
                isSuspended: false,
            })
            .andWhere(
                '(member.memberAuthEnabled = :authDisabled OR member.verifiedAt IS NOT NULL)',
                { authDisabled: false },
            )
            .andWhere('member.id NOT IN (:...excludedIds)', {
                excludedIds: Array.from(excludedMemberIds),
            });

        if (query.location) {
            const normalizedLocation = `%${query.location.trim().toLowerCase()}%`;
            qb.andWhere(
                "LOWER(COALESCE(NULLIF(TRIM(member.location), ''), NULLIF(TRIM(member.address), ''), :defaultLocation)) LIKE :locationFilter",
                {
                    defaultLocation: DEFAULT_MEMBER_LOCATION,
                    locationFilter: normalizedLocation,
                },
            );
        }

        if (query.search) {
            const normalizedSearch = `%${query.search.trim().toLowerCase()}%`;
            qb.andWhere(
                "(LOWER(COALESCE(member.name, '')) LIKE :searchFilter OR LOWER(COALESCE(member.mmid_fullname, '')) LIKE :searchFilter OR LOWER(COALESCE(member.username, '')) LIKE :searchFilter OR LOWER(COALESCE(member.email, '')) LIKE :searchFilter)",
                { searchFilter: normalizedSearch },
            );
        }

        qb.orderBy('member.memberAuthEnabled', 'DESC')
            .addOrderBy('member.id', 'DESC')
            .skip((page - 1) * pageSize)
            .take(pageSize);

        const [members, total] = await qb.getManyAndCount();

        const items = members.map((member) => {
            const relationshipStatus = this.resolveRelationshipFromRows(
                viewerId,
                member.id,
                viewerRows,
            );
            return this.toFriendCardItem(member, relationshipStatus);
        });

        const totalPages = Math.max(1, Math.ceil(total / pageSize));

        return {
            items,
            total,
            page,
            pageSize,
            totalPages,
        };
    }

    /** Lists incoming pending friend requests and accepted friends for the Teman Anda tab.
     * @returns FriendConnectionsInterface containing filtered requests and accepted friends.
     */
    async getFriendConnections(
        viewerId: number,
        query: FriendConnectionsQueryDto,
    ): Promise<FriendConnectionsInterface> {
        const rows = await this.followRepository.find({
            where: [
                { followingId: viewerId, status: 'pending' },
                { followerId: viewerId, status: 'accepted' },
                { followingId: viewerId, status: 'accepted' },
            ],
            relations: ['follower', 'following'],
            order: { followedAt: 'DESC' },
        });

        const incomingRequests: FriendCardItemInterface[] = [];
        const seenRequestMemberIds = new Set<number>();

        const acceptedFriends: FriendCardItemInterface[] = [];
        const seenFriendMemberIds = new Set<number>();

        for (const row of rows) {
            if (row.status === 'accepted') {
                const peer =
                    row.followerId === viewerId ? row.following : row.follower;
                if (
                    this.isMemberEligibleForFriends(peer) &&
                    peer.id !== viewerId &&
                    !seenFriendMemberIds.has(peer.id)
                ) {
                    seenFriendMemberIds.add(peer.id);
                    const card = this.toFriendCardItem(peer, 'accepted');
                    if (
                        this.matchesFriendFilter(
                            card,
                            query.search,
                            query.location,
                        )
                    ) {
                        acceptedFriends.push(card);
                    }
                }
            }
        }

        for (const row of rows) {
            if (
                row.status === 'pending' &&
                row.followingId === viewerId &&
                this.isMemberEligibleForFriends(row.follower)
            ) {
                const requester = row.follower;
                if (
                    requester.id !== viewerId &&
                    !seenFriendMemberIds.has(requester.id) &&
                    !seenRequestMemberIds.has(requester.id)
                ) {
                    seenRequestMemberIds.add(requester.id);
                    const card = this.toFriendCardItem(
                        requester,
                        'incoming_pending',
                    );
                    if (
                        this.matchesFriendFilter(
                            card,
                            query.search,
                            query.location,
                        )
                    ) {
                        incomingRequests.push(card);
                    }
                }
            }
        }

        return {
            requests: incomingRequests,
            friends: acceptedFriends,
            totalFriends: acceptedFriends.length,
        };
    }

    /** Formats a post's plain-text excerpt from description, shortContent, or textContent.
     * @returns Clean single-spaced excerpt up to 180 characters.
     */
    private formatPostExcerpt(post: PostEntity): string {
        const rawSource =
            post.description || post.shortContent || post.textContent || '';
        const withoutHtml = rawSource.replace(/<[^>]*>/g, ' ');
        const normalized = withoutHtml.replace(/\s+/g, ' ').trim();
        if (normalized.length <= 180) {
            return normalized;
        }
        return `${normalized.slice(0, 177)}...`;
    }

    /** Loads a member's public profile, relationship state, connection count, and public posts.
     * @returns FriendMemberProfileInterface for the mobile member profile screen.
     */
    async getFriendMemberProfile(
        viewerId: number,
        targetMemberId: number,
    ): Promise<FriendMemberProfileInterface> {
        const member = await this.userMimateRepository.findOne({
            where: { id: targetMemberId },
        });

        if (!this.isMemberEligibleForFriends(member)) {
            throw new NotFoundException('Profil pengguna tidak ditemukan.');
        }

        const pairRows =
            viewerId === targetMemberId
                ? []
                : await this.followRepository.find({
                      where: [
                          {
                              followerId: viewerId,
                              followingId: targetMemberId,
                          },
                          {
                              followerId: targetMemberId,
                              followingId: viewerId,
                          },
                      ],
                  });

        const relationshipStatus = this.resolveRelationshipFromRows(
            viewerId,
            targetMemberId,
            pairRows,
        );

        const acceptedRows = await this.followRepository.find({
            where: [
                { followerId: targetMemberId, status: 'accepted' },
                { followingId: targetMemberId, status: 'accepted' },
            ],
        });

        const acceptedPeerIds = new Set<number>();
        for (const row of acceptedRows) {
            const peerId =
                row.followerId === targetMemberId
                    ? row.followingId
                    : row.followerId;
            if (typeof peerId === 'number' && peerId !== targetMemberId) {
                acceptedPeerIds.add(peerId);
            }
        }
        const connectionsCount = acceptedPeerIds.size;

        const [recentPosts, postsCount] = await this.postRepository
            .createQueryBuilder('post')
            .where('post.backup_member_id = :memberId', {
                memberId: targetMemberId,
            })
            .andWhere('post.deleted_at IS NULL')
            .andWhere('(post.isHidden IS NULL OR post.isHidden = :isHidden)', {
                isHidden: false,
            })
            .andWhere(
                '(post.isPsychoeducation IS NULL OR post.isPsychoeducation = :isPsychoeducation)',
                { isPsychoeducation: false },
            )
            .orderBy('post.created_at', 'DESC')
            .take(10)
            .getManyAndCount();

        const displayName = this.getMemberName(
            member.name,
            member.mmid_fullname,
            member.id,
        );
        const avatarUrl = this.getMemberAvatarUrl(member);

        const posts: FriendProfilePostInterface[] = recentPosts.map((post) => {
            const publishedDate = post.published_at || post.created_at;
            const publishedLabel = publishedDate
                ? this.dateHelper.getDateRange(publishedDate, new Date())
                : 'Baru saja';

            return {
                id: String(post.id),
                authorName: displayName,
                authorAvatar: avatarUrl,
                publishedAt: publishedLabel || 'Baru saja',
                title: post.title?.trim() || '',
                excerpt: this.formatPostExcerpt(post),
                stats: {
                    views: Number(post.viewsCount ?? 0).toLocaleString('en-US'),
                    likes: Number(post.reactionsCount ?? 0).toLocaleString(
                        'en-US',
                    ),
                    comments: Number(
                        post.totalRepliesCount ?? post.repliesCount ?? 0,
                    ).toLocaleString('en-US'),
                    shares: Number(post.sharesCount ?? 0).toLocaleString(
                        'en-US',
                    ),
                },
            };
        });

        const parsedPreferences = this.getMemberPreferences(member);

        const bioText =
            member.bio?.trim() ||
            member.tagline?.trim() ||
            'Belum ada bio yang ditambahkan.';

        return {
            id: String(member.id),
            memberId: member.id,
            name: displayName,
            username: this.getMemberUsername(member),
            location: this.getMemberLocation(member),
            avatarUrl,
            bio: bioText,
            preferences: parsedPreferences,
            connectionsCount,
            connectionsLabel: `${connectionsCount} koneksi`,
            relationshipStatus,
            postsCount,
            posts,
        };
    }

    /** Creates a pending friend request from requesterId to targetMemberId inside a transaction.
     * @returns FriendMutationResultInterface with the updated relationshipStatus.
     */
    async sendFriendRequest(
        requesterId: number,
        targetMemberId: number,
    ): Promise<FriendMutationResultInterface> {
        if (requesterId === targetMemberId) {
            throw new BadRequestException(
                'Anda tidak dapat menambahkan diri sendiri sebagai teman.',
            );
        }

        return this.userMimateRepository.manager.transaction(
            async (manager) => {
                const orderedIds = [requesterId, targetMemberId].sort(
                    (a, b) => a - b,
                );
                const lockedMembers = await manager
                    .createQueryBuilder(UserMimateEntity, 'member')
                    .setLock('pessimistic_write')
                    .where('member.id IN (:...orderedIds)', { orderedIds })
                    .getMany();

                const requester = lockedMembers.find(
                    (item) => item.id === requesterId,
                );
                const target = lockedMembers.find(
                    (item) => item.id === targetMemberId,
                );

                if (
                    !this.isMemberEligibleForFriends(requester) ||
                    !this.isMemberEligibleForFriends(target)
                ) {
                    throw new NotFoundException('Pengguna tidak ditemukan.');
                }

                const existingRows = await manager.find(UserFollowEntity, {
                    where: [
                        {
                            followerId: requesterId,
                            followingId: targetMemberId,
                        },
                        {
                            followerId: targetMemberId,
                            followingId: requesterId,
                        },
                    ],
                });

                const acceptedRow = existingRows.find(
                    (row) => row.status === 'accepted',
                );
                if (acceptedRow) {
                    throw new ConflictException(
                        'Anda sudah berteman dengan pengguna ini.',
                    );
                }

                const outgoingPending = existingRows.find(
                    (row) =>
                        row.followerId === requesterId &&
                        row.followingId === targetMemberId &&
                        row.status === 'pending',
                );
                if (outgoingPending) {
                    return {
                        memberId: targetMemberId,
                        relationshipStatus: 'outgoing_pending',
                    };
                }

                const incomingPending = existingRows.find(
                    (row) =>
                        row.followerId === targetMemberId &&
                        row.followingId === requesterId &&
                        row.status === 'pending',
                );
                if (incomingPending) {
                    throw new ConflictException(
                        'Pengguna ini sudah mengirimkan permintaan pertemanan kepada Anda.',
                    );
                }

                const requestRow = manager.create(UserFollowEntity, {
                    follower: requester,
                    following: target,
                    followerId: requesterId,
                    followingId: targetMemberId,
                    status: 'pending',
                    respondedAt: null,
                    seen: 0,
                });

                await manager.save(UserFollowEntity, requestRow);

                return {
                    memberId: targetMemberId,
                    relationshipStatus: 'outgoing_pending',
                };
            },
        );
    }

    /** Approves an incoming pending friend request sent by requesterId to recipientId.
     * @returns FriendMutationResultInterface with relationshipStatus 'accepted'.
     */
    async acceptFriendRequest(
        recipientId: number,
        requesterId: number,
    ): Promise<FriendMutationResultInterface> {
        if (recipientId === requesterId) {
            throw new BadRequestException('Permintaan pertemanan tidak valid.');
        }

        return this.userMimateRepository.manager.transaction(
            async (manager) => {
                const orderedIds = [recipientId, requesterId].sort(
                    (a, b) => a - b,
                );
                const lockedMembers = await manager
                    .createQueryBuilder(UserMimateEntity, 'member')
                    .setLock('pessimistic_write')
                    .where('member.id IN (:...orderedIds)', { orderedIds })
                    .getMany();

                const recipient = lockedMembers.find(
                    (item) => item.id === recipientId,
                );
                const requester = lockedMembers.find(
                    (item) => item.id === requesterId,
                );

                if (
                    !this.isMemberEligibleForFriends(recipient) ||
                    !this.isMemberEligibleForFriends(requester)
                ) {
                    throw new NotFoundException('Pengguna tidak ditemukan.');
                }

                const pairRows = await manager.find(UserFollowEntity, {
                    where: [
                        { followerId: requesterId, followingId: recipientId },
                        { followerId: recipientId, followingId: requesterId },
                    ],
                });

                const alreadyAccepted = pairRows.find(
                    (row) => row.status === 'accepted',
                );
                if (alreadyAccepted) {
                    return {
                        memberId: requesterId,
                        relationshipStatus: 'accepted',
                    };
                }

                const incomingRequest = pairRows.find(
                    (row) =>
                        row.followerId === requesterId &&
                        row.followingId === recipientId &&
                        row.status === 'pending',
                );
                if (!incomingRequest) {
                    throw new NotFoundException(
                        'Permintaan pertemanan tidak ditemukan.',
                    );
                }

                incomingRequest.status = 'accepted';
                incomingRequest.respondedAt = new Date();
                incomingRequest.seen = 1;
                await manager.save(UserFollowEntity, incomingRequest);

                const reversePendingRows = pairRows.filter(
                    (row) => row.id !== incomingRequest.id,
                );
                if (reversePendingRows.length > 0) {
                    await manager.remove(UserFollowEntity, reversePendingRows);
                }

                await this.syncAcceptedConnectionCount(manager, recipientId);
                await this.syncAcceptedConnectionCount(manager, requesterId);

                return {
                    memberId: requesterId,
                    relationshipStatus: 'accepted',
                };
            },
        );
    }

    /** Declines and removes an incoming pending friend request so the sender can request again later.
     * @returns FriendMutationResultInterface with relationshipStatus 'none'.
     */
    async declineFriendRequest(
        recipientId: number,
        requesterId: number,
    ): Promise<FriendMutationResultInterface> {
        if (recipientId === requesterId) {
            throw new BadRequestException('Permintaan pertemanan tidak valid.');
        }

        return this.userMimateRepository.manager.transaction(
            async (manager) => {
                const orderedIds = [recipientId, requesterId].sort(
                    (a, b) => a - b,
                );
                await manager
                    .createQueryBuilder(UserMimateEntity, 'member')
                    .setLock('pessimistic_write')
                    .where('member.id IN (:...orderedIds)', { orderedIds })
                    .getMany();

                const incomingRequest = await manager.findOne(
                    UserFollowEntity,
                    {
                        where: {
                            followerId: requesterId,
                            followingId: recipientId,
                            status: 'pending',
                        },
                    },
                );

                if (!incomingRequest) {
                    throw new NotFoundException(
                        'Permintaan pertemanan tidak ditemukan.',
                    );
                }

                await manager.remove(UserFollowEntity, incomingRequest);

                return {
                    memberId: requesterId,
                    relationshipStatus: 'none',
                };
            },
        );
    }
}
