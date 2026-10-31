import { recordNotificationEvent } from '../notification-events/record-notification-event';
import { NotificationType } from '../entity/member-notification.entity';
import { ContentModerationService } from '../content-moderation/content-moderation.service';
import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { PostEntity, PostType } from 'src/entity/post.entity';
import { In, IsNull, Not, Repository, MoreThanOrEqual } from 'typeorm';
import Redis from 'ioredis';
import { v1 as uuidv1 } from 'uuid';
import { Information, PostCollectionResponse, Post, Reaction, Tag, Media } from './interfaces/post.interface';
import { TagsEntity } from 'src/entity/tags.entity';
import { PostTagsEntity } from 'src/entity/post-tags.entity';
import { CreatePostDto } from './dtos/create-post.dto';
import { AssetsEntity } from 'src/entity/asset.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { SpaceEntity } from 'src/entity/space.entity';
import { UserFollowEntity } from 'src/entity/user-follow.entity';
import { DateHelper } from 'src/common/helpers/date.helper';
import { MemberSpaceEntity } from 'src/entity/member-spaces.entity';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { ActivityService } from 'src/activity/activity.service';
import { MemberVoteService } from 'src/member-vote/member-vote.service';
import { UserAdmin } from 'src/entity/user-admin.entity';



@Injectable()
export class PostService {
    private redis: Redis; // Configure as needed
    private deeplink
    constructor(
        @InjectRepository(PostEntity, 'mimate')
        private postRepository: Repository<PostEntity>,

        @InjectRepository(TagsEntity, 'mimate')
        private tagRepository: Repository<TagsEntity>,

        @InjectRepository(PostTagsEntity, 'mimate')
        private postTagRepository: Repository<PostTagsEntity>,

        @InjectRepository(AssetsEntity, 'mimate')
        private assetRepository: Repository<AssetsEntity>,

        @InjectRepository(UserMimateEntity, 'mimate')
        private userMimateRepository: Repository<UserMimateEntity>,

        @InjectRepository(SpaceEntity, 'mimate')
        private spaceRepository: Repository<SpaceEntity>,
        // create entity
        @InjectRepository(UserFollowEntity, 'mimate')
        private userFollowRepository: Repository<UserFollowEntity>,

        @InjectRepository(MemberSpaceEntity, 'mimate')
        private memberSpaceRepository: Repository<MemberSpaceEntity>,

        @InjectRepository(UserAdmin, 'mimate')
        private userAdminRepository: Repository<UserAdmin>,

        private activityService: ActivityService,
        private readonly dateHelper: DateHelper,
        private readonly redisService: RedisService,
        private readonly memberVoteService: MemberVoteService,
        private readonly moderation: ContentModerationService
    ) {
        this.deeplink = process.env.DEEPLINK_URL
        this.redis = this.redisService.getOrNil('default')
        if (!this.redis) {
            console.warn('Redis client not found. Skipping cache initialization.');
        }
    }


    formatDate(date: Date): string {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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

    async collectPosts(mode: string, limit: number, after: string, IDvalue?: number, sort?: string, userId?: number, source?: string): Promise<PostCollectionResponse> {
        let countingTotalPost: boolean = true
        let totalData: number = 0
        let page: number = 1
        let offset: number = 0
        let cacheKey: string;
        let redisInfo: Information
        let postQuery: PostEntity[]

        const skipHiddenFilter = false
        // let modes = [
        //     'latest',
        //     'space',
        //     'member',
        //     'following',
        // ];

        // if (modes.includes(mode)) {
        //     // set statik dari mobile
        //     if(limit == 5) {
        //         limit = 3
        //     }
        // }



        if (after != "") {
            // find in redis
            cacheKey = `${mode}Posts:${userId}:${IDvalue}:${sort}:${limit}:${after}`;
            const cachedInformation = await this.redis.get(cacheKey);

            if (cachedInformation) {
                redisInfo = JSON.parse(cachedInformation);
                totalData = redisInfo.totalData
                page = redisInfo.page + 1
                offset = redisInfo.page * redisInfo.limit
                countingTotalPost = false
            } else {
                // generate new after
                after = uuidv1()
            }
        } else {
            after = uuidv1()
        }
        if (countingTotalPost) {
            totalData = await this.postRepository.count(
                skipHiddenFilter
                    ? { where: { isPsychoeducation: false } }
                    : { where: { isHidden: false, isPsychoeducation: false } },
            )
        }

        let order: object = {}
        let dateLimit: Date | undefined = undefined;
        if (sort == 'popular') {
            // For space mode with popular sort, we'll use a custom query to prioritize recent posts
            if (mode == 'space') {
                dateLimit = new Date();
                dateLimit.setDate(dateLimit.getDate() - 30);
            } else {
                order = {
                    totalRepliesCount: "DESC",
                    published_at: "DESC"
                }
            }
        } else {
            order = {
                published_at: "DESC"
            }
        }


        let config: any = {
            take: limit,
            skip: offset,
            order: order,
            relations: ['member', 'reactionList', 'reactionList.member', 'medias', 'space']
        }

        if (mode == 'member') {
            let whereCond: any = {
                isPsychoeducation: false,
                member: {
                    id: IDvalue
                },
            };
            if (!skipHiddenFilter) {
                whereCond.isHidden = false
            }
            // No 30-day filter for member mode
            totalData = await this.postRepository.count({ where: whereCond })
            config = { where: whereCond, ...config }
        }

        else if (mode == 'space') {
            let whereCond: any = {
                isPsychoeducation: false,
                space: {
                    id: IDvalue
                },
            };
            if (!skipHiddenFilter) {
                whereCond.isHidden = false
            }

            if (sort == 'popular' && dateLimit) {
                // For popular sort in space mode, use custom ordering to prioritize recent posts
                config = {
                    where: whereCond,
                    ...config,
                    order: {
                        // First prioritize posts from last 30 days, then by totalRepliesCount
                        totalRepliesCount: "DESC",
                        published_at: "DESC"
                    }
                }
            } else {
                config = { where: whereCond, ...config }
            }

            totalData = await this.postRepository.count({ where: whereCond })
        }

        else if (mode == 'highlight') {
            let whereCond: any = {
                isPsychoeducation: false,
                is_highlight: true,
            };
            if (!skipHiddenFilter) {
                whereCond.isHidden = false
            }
            // No 30-day filter for highlight mode
            totalData = await this.postRepository.count({ where: whereCond })
            config = {
                where: whereCond, ...config, order: {
                    order: "ASC"
                }
            }
        } else if (mode == 'following') {

            // get accepted friends in either direction
            let following = await this.userFollowRepository.find({
                where: [
                    {
                        followerId: userId,
                        status: 'accepted',
                    },
                    {
                        followingId: userId,
                        status: 'accepted',
                    },
                ],
            })

            const friendIds = following
                .map((item) =>
                    item.followerId === userId
                        ? item.followingId
                        : item.followerId,
                )
                .filter((id): id is number => typeof id === 'number');

            // get total data with following
            let whereCond: any = {
                isPsychoeducation: false,
                member: {
                    id: In(friendIds),
                },
            };
            if (!skipHiddenFilter) {
                whereCond.isHidden = false
            }
            // No 30-day filter for following mode
            totalData = await this.postRepository.count({ where: whereCond })

            // get post following
            config = { where: whereCond, ...config }
        } else {
            let whereCond: any = { isPsychoeducation: false };
            if (!skipHiddenFilter) {
                whereCond.isHidden = false
            }
            // No 30-day filter for default mode
            config = { where: whereCond, ...config }
        }
        config.where = { ...config.where, status: 'PUBLISHED', isHidden: false };
        totalData = await this.postRepository.count({ where: config.where });
        postQuery = await this.postRepository.find(config)

        let posts: Post[] = []
        for (let index = 0; index < postQuery.length; index++) {
            const element = postQuery[index];

            if (element.member == null) {
                continue;
            }

            let reactions: Reaction[] = []
            const reactionMap: Record<string, { reaction: string, count: number; reacted: boolean }> = {};

            const reactionCount = element.reactionList.length

            for (const reaction of element.reactionList) {
                const type = reaction.reaction;
                if (!reactionMap[type]) {
                    reactionMap[type] = { reaction: type, count: 0, reacted: false };
                }

                reactionMap[type].count++;

                if (reaction.member !== null) {
                    if (reaction.member.id === userId) {
                        reactionMap[type].reacted = true;
                    }
                }
            }
            reactions = Object.values(reactionMap);

            let tags: Tag[] = []

            if (element.tags != null) {
                let listTags = JSON.parse(element.tags)
                for (let index = 0; index < listTags.length; index++) {



                    const item = listTags[index];

                    //check if id type string
                    if (typeof item.id === 'string') {
                        // check in database tag and get the id
                        let tag = await this.tagRepository.findOneBy({ tagId: item.id })
                        if (tag) {
                            item.id = tag.id
                        }
                    }

                    let tag: Tag = {
                        slug: item.slug,
                        id: item.id,
                        title: item.title
                    }
                    tags.push(tag)
                }
            }


            let medias: Media[] = []

            let listMedias = element.medias

            for (let index = 0; index < listMedias.length; index++) {
                const asset = listMedias[index];

                let info = JSON.parse(asset.info)
                let insertMedia: Media = {
                    id: asset.id,
                    url: asset.url_open,
                    type: asset.type == null ? info.__typename : asset.type
                }

                if (asset.type == 'Video') {
                    insertMedia.thumbnail = info.thumbnail

                    if (mode == 'highlight' && limit == 5) {
                        insertMedia.type = 'Image'
                        insertMedia.url = info.thumbnail.url_open
                    }
                } else {
                    insertMedia.thumbnail = {
                        url: asset.url_open,

                        width: info.width ?? 0,
                        height: info.height ?? 0,
                        type: asset.type
                    }
                }

                medias.push(insertMedia)

            }

            let published_at_title = this.dateHelper.getDateRange(new Date(element.published_at), new Date())

            // check if the post is owner
            let is_post_owner = false
            if (element.member.id == userId) {
                is_post_owner = true
            }

            // check image

            let name = element.createdBy === 'Anonim'
            ? 'Anonim'
            : this.getMemberName(element.member.name, element.member.mmid_fullname, element.member.id)

            let votes: { id: number; vote: string; total_vote?: number; percentage?: number }[] = [];
            let my_vote_id = 0
            if (element.post_type === PostType.Vote && element.id) {
                try {
                    const voteDetail = await this.memberVoteService.getVoteDetailByPostId(element.id, userId);
                    votes = voteDetail.votes ?? [];
                    my_vote_id = voteDetail.my_vote_id
                } catch {
                    votes = [];
                    my_vote_id = 0
                }
            }

            let post: Post = {
                id: element.id,
                title: element.title,
                description: element.textContent,
                textContent: element.textContent,
                image: element.image,
                reaction: reactions,
                tags: tags,
                repliesCount: element.totalRepliesCount,
                reactionCount: reactionCount,
                member: {
                    id: element.member.id,
                    name: name,
                    email: element.member.email,
                    profilePictureUrl: element.member.profilePictureUrl,
                    is_dealer: element.member.is_dealer
                },
                space: {
                    id: element.space.id,
                    name: element.space.name,
                    description: element.space.description,
                    postsCount: element.space.postsCount,
                    membersCount: element.space.membersCount
                },
                medias: medias,
                mmidUserId: element.member.userId || 0,
                totalRepliesCount: element.totalRepliesCount,
                created_at: this.formatDate(element.created_at),
                published_at: this.formatDate(element.updated_at),
                published_at_title: published_at_title,
                type: element.type,
                post_type: element.post_type ? element.post_type : 'post',
                vote_start: element.vote_start ? this.formatDate(new Date(element.vote_start)) : null,
                vote_end: element.vote_end ? this.formatDate(new Date(element.vote_end)) : null,
                total_vote: element.total_vote,
                is_post_owner: is_post_owner,
                is_hidden: element.isHidden,
                votes: votes,
                my_vote_id: my_vote_id,
                share_url: `${this.deeplink}/deeplink/mimate?page=post&id=${element.id}`
            }


            if (mode == 'highlight' && limit >= 5) {
                post.image = element.member.profilePictureUrl
                post.type = 'image'
            }



            if (mode != 'highlight') {
                // add action activity
                await this.activityService.createActivity({
                    userId: userId,
                    action: 'view',
                    postId: element.id,
                    targetType: 'post',
                    source: source,
                    hit_from: mode
                })
            }
            posts.push(post)
        }

        // save in redis
        redisInfo = {
            totalData: totalData,
            hasNext: totalData > page * limit,
            page: page,
            limit: limit,
            offset: offset,
            after: after
        }

        // describe again for get new key
        cacheKey = `${mode}Posts:${userId}:${IDvalue}:${sort}:${limit}:${after}`;
        await this.redis.set(cacheKey, JSON.stringify(redisInfo), 'EX', 60 * 5); // 5 min TTL

        return {
            totalData: totalData,
            hasNext: totalData > page * limit,
            page: page,
            limit: limit,
            offset: offset,
            after: after,
            data: posts
        }
    }


    async detailPost(id: number, userId: number): Promise<Post> {
        // update views count
        await this.postRepository.update({ id: id, isPsychoeducation: false }, { viewsCount: () => 'viewsCount + 1' })

        const query = await this.postRepository.find(
            {
                where: {
                    id: id,
                    isPsychoeducation: false,
                    deleted_at: IsNull()
                },
                take: 1,
                relations: ['member', 'reactionList', 'reactionList.member', 'medias', 'space']
            }
        )
        if (query.length == 0) {
            throw new NotFoundException();
        }

        // ambil data pertama
        let element = query[0]
        let reactions: Reaction[] = []


        const reactionMap: Record<string, { reaction: string, count: number; reacted: boolean }> = {};

        let reactionCount: number = element.reactionList.length

        for (const reaction of element.reactionList) {
            const type = reaction.reaction;
            if (!reactionMap[type]) {
                reactionMap[type] = { reaction: type, count: 0, reacted: false };
            }

            reactionMap[type].count++;

            if (reaction.member == null) {
                continue;
            }

            if (reaction.member.id === userId) {
                reactionMap[type].reacted = true;
            }
        }


        reactions = Object.values(reactionMap);



        let tags: Tag[] = []

        if (element.tags != null) {
            let listTags = JSON.parse(element.tags)
            for (let index = 0; index < listTags.length; index++) {
                const item = listTags[index];

                //check if id type string
                if (typeof item.id === 'string') {
                    // check in database tag and get the id
                    let tag = await this.tagRepository.findOneBy({ tagId: item.id })
                    if (tag) {
                        item.id = tag.id
                    }
                }

                let tag: Tag = {
                    slug: item.slug,
                    id: item.id,
                    title: item.title
                }

                tags.push(tag)
            }
        }

        let medias: Media[] = []

        let listMedias = element.medias

        for (let index = 0; index < listMedias.length; index++) {
            const asset = listMedias[index];

            let info = JSON.parse(asset.info)
            let insertMedia: Media = {
                id: asset.id,
                url: asset.url_open,
                width: info.width ?? 0,
                height: info.height ?? 0,
                type: asset.type == null ? info.__typename : asset.type
            }


            if (asset.type == 'Video') {
                insertMedia.thumbnail = info.thumbnail
            } else {
                insertMedia.thumbnail = {
                    url: asset.url_open,
                    width: info.width ?? 0,
                    height: info.height ?? 0,
                    type: asset.type
                }
            }

            medias.push(insertMedia)

        }

        let published_at_title = this.dateHelper.getDateRange(new Date(element.created_at), new Date())

        let name = element.createdBy === 'Anonim'
            ? 'Anonim'
            : this.getMemberName(element.member.name, element.member.mmid_fullname, element.member.id)


        let votes: { id: number; vote: string; total_vote?: number; percentage?: number }[] = [];
        let my_vote_id = 0
        if (element.post_type === PostType.Vote && element.id) {
            try {
                const voteDetail = await this.memberVoteService.getVoteDetailByPostId(element.id, userId);
                votes = voteDetail.votes ?? [];
                my_vote_id = voteDetail.my_vote_id
            } catch {
                votes = [];
                my_vote_id = 0
            }
        }

        let post: Post = {
            id: element.id,
            title: element.title,
            description: element.textContent,
            textContent: element.textContent,
            image: element.image,
            reaction: reactions,
            tags: tags,
            repliesCount: element.totalRepliesCount,
            reactionCount: reactionCount,
            member: {
                id: element.member.id,
                name: name,
                email: element.member.email,
                profilePictureUrl: element.member.profilePictureUrl,
                is_dealer: element.member.is_dealer
            },
            space: {
                id: element.space.id,
                name: element.space.name,
                description: element.space.description,
                postsCount: element.space.postsCount,
                membersCount: element.space.membersCount
            },
            medias: medias,
            mmidUserId: element.member.userId,
            totalRepliesCount: element.totalRepliesCount,
            created_at: this.formatDate(element.created_at),
            published_at: this.formatDate(element.updated_at),
            published_at_title: published_at_title,
            type: element.type,
            post_type: element.post_type,
            votes: votes,
            my_vote_id: my_vote_id,
            is_post_owner: element.member.id === userId,
            vote_start: element.vote_start ? this.formatDate(new Date(element.vote_start)) : null,
            vote_end: element.vote_end ? this.formatDate(new Date(element.vote_end)) : null,
            total_vote: element.total_vote,
            share_url: `${this.deeplink}/deeplink/mimate?page=post&id=${element.id}`
        }
        return post
    }


    private shortenText(text: string, wordLimit = 20) {
        const words = text.trim().split(/\s+/);
        return words.slice(0, wordLimit).join(" ") + (words.length > wordLimit ? "..." : "");
    }

    private slugify(text: string) {
        return text
            .toString()                      // Cast to string
            .normalize('NFD')                // Normalize accents
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .toLowerCase()                   // Convert to lowercase
            .trim()                          // Remove surrounding whitespace
            .replace(/[^a-z0-9 -]/g, '')     // Remove invalid chars
            .replace(/\s+/g, '-')            // Replace spaces with -
            .replace(/-+/g, '-');            // Collapse multiple -
    }

    async createPost(params: CreatePostDto, memberId: number, userId: number, authorizedCmsAdmin = false): Promise<Post> {

        // set input
        const { title, content, spaceId, tags, mediaIds, type, post_type: postType = PostType.Post, vote_start: voteStart, vote_end: voteEnd } = params;


        const moderation = await this.moderation.assertPublishable(
            [title, content, ...(params.tags ?? []), ...(params.votes ?? []).map((option) => option.vote)], memberId, authorizedCmsAdmin,
        );

        let shortenText = this.shortenText(content)

        // get spaceID 
        let space = spaceId ? await this.spaceRepository.findOneBy({ id: spaceId }) : null
        if (!space) {
            space = (await this.spaceRepository.findOne({ where: { id: 7 } })) ||
                (await this.spaceRepository.findOne({ where: { backup_space_id: Not(0) } }))
        }

        // check if space dealer
        if (space && space.is_dealer) {
            // check if member is dealer
            let member = await this.userMimateRepository.findOneBy({ id: memberId })
            if (!member.is_dealer) {
                throw new ForbiddenException('You are not a dealer')
            }
        }

        let dataThumb: AssetsEntity | null = null
        let image: string | null = params.image || null
        if (mediaIds && mediaIds.length > 0) {
            dataThumb = await this.assetRepository.findOneBy({ id: mediaIds[0] })

            if (dataThumb) {
                let info = JSON.parse(dataThumb.info)
                let type = (dataThumb.type == null) ? info.__typename : dataThumb.type

                if (type == 'Video') {
                    image = info.thumbnail.url
                } else {
                    image = dataThumb.url
                }
            }

        }

        let tagCollection: string;
        let tempTags: TagsEntity[] = [];

        if (content) {
            // Step 1: Extract hashtags like #tagName from content
            // const contentTags = content.match(/#(\w+)/g); // e.g. ['#tag1', '#tag2']
            const contentTags = content.match(/#[^\s#]+/g);

            if (contentTags) {
                // Step 2: Clean and deduplicate tags
                const uniqueTags = Array.from(
                    new Set(contentTags.map(tag => tag.replace('#', '').toLowerCase()))
                );

                // Step 3: Process each tag
                for (const tag of uniqueTags) {
                    const slugTag = this.slugify(tag);
                    let findTag = await this.tagRepository.findOneBy({ slug: slugTag, isContentCategory: false });

                    if (findTag) {
                        tempTags.push(findTag);
                    } else {
                        const tagInput: TagsEntity = {
                            tagId: null,
                            title: tag,
                            slug: slugTag,
                        };
                        findTag = await this.tagRepository.save(tagInput);
                        tempTags.push(findTag);
                    }
                }

                // Step 4: Store result as JSON string
                tagCollection = JSON.stringify(tempTags);
            }
        }


        //member
        let member = await this.userMimateRepository.findOneBy({ id: memberId })


        // create post
        let paramSend: PostEntity = {
            subscribersCount: 0,
            reactionsCount: 0,
            status: "PUBLISHED",
            moderation,
            spaceId: space?.spaceId,
            space: space,
            repliesCount: 0,
            totalRepliesCount: 0,
            isHidden: false,
            title: title,
            description: shortenText,
            textContent: content,
            thumbnail: dataThumb == null ? null : dataThumb.info,
            image: image,
            createdBy: params.is_anonymous ? 'Anonim' : null,
            tags: tagCollection,
            mediaIds: JSON.stringify(mediaIds),
            hasMoreContent: 1,
            created_at: new Date(),
            updated_at: new Date(),
            published_at: new Date(),
            type: type,
            post_type: postType,
            vote_start: voteStart ? new Date(voteStart) : undefined,
            vote_end: voteEnd ? new Date(voteEnd) : undefined,
            member: member
        }

        // save post to get IDs
        const post = await this.postRepository.manager.transaction(async (manager) => {
            const saved = await manager.save(PostEntity, paramSend);
            if (!authorizedCmsAdmin) {
                await recordNotificationEvent(manager, NotificationType.Forum, saved.id);
            }
            return saved;
        });

        // update tags post
        for (let index = 0; index < tempTags.length; index++) {
            const element: TagsEntity = tempTags[index];

            let postTag: PostTagsEntity = {
                post: post,
                tag: element,
                slug: element.slug,
                title: element.title,
                created_at: new Date(),
                updated_at: new Date()
            }
            await this.postTagRepository.save(postTag)
        }


        if (mediaIds) {
            // update assset
            for (let index = 0; index < mediaIds.length; index++) {
                const element = mediaIds[index];

                // update
                await this.assetRepository.update({ id: element }, { post: post })

            }
        }

        // update total_post in member and space
        await this.updateTotalPost(memberId, spaceId)


        return await this.detailPost(post.id, userId)
    }


    // wrap as function 
    async updateTotalPost(memberId: number, spaceId: number) {
        // calculating total_post in member, first get post who user upload, count and updte in table member
        let postMember = await this.postRepository.find({ where: { member: { id: memberId }, isPsychoeducation: false } })
        let totalPost = postMember.length
        await this.userMimateRepository.update({ id: memberId }, { total_posts: totalPost })

        // calculating total_post in space, first get post who space, count and updte in table space
        let postSpace = await this.postRepository.find({ where: { space: { id: spaceId } } })
        let totalPostSpace = postSpace.length
        await this.spaceRepository.update({ id: spaceId }, { postsCount: totalPostSpace })
    }


    async updatePost(postId: number, params: CreatePostDto, memberId: number, userId: number, authorizedCmsAdmin = false): Promise<Post> {

        const existingPost = await this.postRepository.findOne({
            where: { id: postId, isPsychoeducation: false },
            relations: ['member', 'space']
        });

        if (!existingPost) {
            throw new NotFoundException('Post not found');
        }

        // if member admin
        let checkAdmin = await this.userMimateRepository.findOneBy({ id: memberId, member_role: 1 })
        let IsAdmin = false

        if (checkAdmin) {
            IsAdmin = true // admin
        }

        if (!IsAdmin) {
            if (existingPost.member.id !== memberId) {
                throw new ForbiddenException('You are not the owner of this post');
            }
        }

        const { title, content, spaceId, tags, mediaIds, type, post_type: postType, vote_start: voteStart, vote_end: voteEnd } = params;
        existingPost.moderation = await this.moderation.assertPublishable(
            [title ?? existingPost.title, content ?? existingPost.textContent,
                ...(params.tags ?? []), ...(params.votes ?? []).map((option) => option.vote)], memberId, authorizedCmsAdmin,
        );
        const timestamp = new Date()

        if (title !== undefined) existingPost.title = title;
        if (content !== undefined) {
            existingPost.textContent = content;
            existingPost.description = this.shortenText(content);
        }

        if (spaceId !== undefined) {
            const space = await this.spaceRepository.findOneBy({ id: spaceId });
            if (space) {
                existingPost.spaceId = space.spaceId;
                existingPost.space = space;
            }
        }

        // Handle tags extraction from content (same logic as createPost)
        if (content !== undefined) {
            let tagCollection: string;
            let tempTags: TagsEntity[] = [];

            if (content) {
                // Step 1: Extract hashtags like #tagName from content
                // const contentTags = content.match(/#(\w+)/g); // e.g. ['#tag1', '#tag2']
                const contentTags = content.match(/#[^\s#]+/g);

                if (contentTags) {
                    // Step 2: Clean and deduplicate tags
                    const uniqueTags = Array.from(
                        new Set(contentTags.map(tag => tag.replace('#', '').toLowerCase()))
                    );

                    // Step 3: Process each tag
                    for (const tag of uniqueTags) {
                        const slugTag = this.slugify(tag);
                        let findTag = await this.tagRepository.findOneBy({ slug: slugTag, isContentCategory: false });

                        if (findTag) {
                            tempTags.push(findTag);
                        } else {
                            const tagInput: TagsEntity = {
                                tagId: null,
                                title: tag,
                                slug: slugTag,
                            };
                            findTag = await this.tagRepository.save(tagInput);
                            tempTags.push(findTag);
                        }
                    }

                    // Step 4: Store result as JSON string
                    tagCollection = JSON.stringify(tempTags);
                }
            }

            // Delete existing post tags
            await this.postTagRepository.delete({ post: { id: postId } });

            // Update tags post
            for (let index = 0; index < tempTags.length; index++) {
                const element: TagsEntity = tempTags[index];

                let postTag: PostTagsEntity = {
                    post: existingPost,
                    tag: element,
                    slug: element.slug,
                    title: element.title,
                    created_at: timestamp,
                    updated_at: timestamp
                }
                await this.postTagRepository.save(postTag)
            }

            existingPost.tags = tagCollection;
        }

        if (mediaIds !== undefined) {
            const asset = await this.assetRepository.findOneBy({ id: mediaIds[0] });
            if (asset) {
                const info = JSON.parse(asset.info);
                existingPost.thumbnail = asset.info;
                existingPost.image = asset.type === 'Video' ? info.thumbnail.url : asset.url;
            }

            existingPost.mediaIds = JSON.stringify(mediaIds);

            // deleted all attachment
            await this.assetRepository.update({ post: existingPost }, { post: null })

            for (const assetId of mediaIds) {
                await this.assetRepository.update({ id: assetId }, { post: existingPost });
            }
        }

        if (params.image !== undefined) {
            existingPost.image = params.image || null;
        }
        if (params.is_anonymous !== undefined) {
            existingPost.createdBy = params.is_anonymous ? 'Anonim' : null;
        }

        existingPost.updated_at = timestamp;
        if (authorizedCmsAdmin) {
            existingPost.isHidden = false;
        }
        existingPost.type = type
        if (postType !== undefined) existingPost.post_type = postType
        if (voteStart !== undefined) existingPost.vote_start = voteStart ? new Date(voteStart) : null;
        if (voteEnd !== undefined) existingPost.vote_end = voteEnd ? new Date(voteEnd) : null;

        await this.postRepository.save(existingPost);

        return this.detailPost(existingPost.id, userId);
    }


    async deletePost(
        postId: number,
        memberId: number,
        authorizedCmsAdmin = false,
    ): Promise<Boolean> {

        const existingPost = await this.postRepository.findOne({
            where: { id: postId, isPsychoeducation: false },
            relations: ['member', 'space']
        });

        if (!existingPost) {
            throw new NotFoundException('Post not found');
        }

        if (!authorizedCmsAdmin) {
            // if member admin
            let checkAdmin = await this.userMimateRepository.findOneBy({ id: memberId, member_role: 1 })
            let IsAdmin = false

            if (checkAdmin) {
                IsAdmin = true // admin
            }

            if (!IsAdmin) {
                if (existingPost.member.id !== memberId) {
                    throw new ForbiddenException('You are not the owner of this post');
                }
            }
        }

        await this.postRepository.softRemove(existingPost);

        // delete in member total_post
        await this.updateTotalPost(existingPost.member.id, existingPost.space.id)

        return true
    }

    async memberOnNotification(spaceId: number): Promise<MemberSpaceEntity[]> {
        // find space
        let space = await this.spaceRepository.findOneBy({ id: spaceId })

        let where: any = { space: { id: spaceId }, notification: true, follow: true }

        if (space.is_dealer) {
            where = { space: { id: spaceId }, notification: true }
        }

        // find member
        let members = await this.memberSpaceRepository.find({ where: where, relations: ["member", "space"] })
        return members
    }

    //    get all member except self
    async getMemberExceptSelf(memberId: number): Promise<any> {
        // get all member
        let members = await this.userMimateRepository.find({ select: { userId: true }, where: { id: Not(memberId) } })

        // member email
        //  let email = [
        //     'ilhamhuda6@gmail.com',
        //     'abid.ramadhan0698@gmail.com',
        //     'natanaelkristiawan@maxsol.id',
        //     'pariarsamade89@gmail.com',
        //     'buatrosa123@gmail.com'
        // ]

        // get member by email
        // let members = await this.userMimateRepository.find({where: {email: In(email)}})


        // group each data 1000 member
        let memberGroup = members.reduce((acc, member, index) => {
            const groupIndex = Math.floor(index / 1000);
            if (!acc[groupIndex]) {
                acc[groupIndex] = [];
            }
            acc[groupIndex].push(member);
            return acc;
        }, []);


        return memberGroup;
    }


    // sync image to asset
    async syncImageToAsset(): Promise<any> {

        // get all post
        let posts = await this.postRepository.find({ where: { image_backup: Not(IsNull()) } })

        for (let index = 0; index < posts.length; index++) {
            const post = posts[index];

            // find asset by image_backup to url_open
            let asset = await this.assetRepository.findOneBy({ url_old: post.image_backup })
            if (asset) {
                // update asset
                await this.postRepository.update({ id: post.id }, { image: asset.url })
            } else {
            }

        }

        return true
    }

    // sync image to image_open_url
    async syncImageToImageOpenUrl(): Promise<any> {
        // get all post
        let posts = await this.postRepository.find({ where: { image: Not(IsNull()), image_open_url: IsNull() } })

        for (let index = 0; index < posts.length; index++) {
            const post = posts[index];

            // find asset by image_backup to url_open
            let asset = await this.assetRepository.findOneBy({ url: post.image })
            if (asset) {
                if (asset.type == 'Video') {
                    let info = JSON.parse(asset.info)
                    post.image_open_url = info.thumbnail.url_open
                } else {
                    post.image_open_url = asset.url_open
                }
                // update post
                await this.postRepository.save(post)
            }
        }

        return true
    }


    // sync comment count to post
    async syncCommentCountToPost(): Promise<any> {
        // get all post
        let posts = await this.postRepository.find({ relations: ['comments'] })

        // loop each post
        for (let index = 0; index < posts.length; index++) {
            const post = posts[index];

            // find coment where parent_id is null
            let comments = post.comments.filter(comment => comment.backup_comment_id === null)
            let repliesCount = comments.length
            let totalRepliesCount = post.comments.length

            // update post
            await this.postRepository.update({ id: post.id }, { totalRepliesCount: totalRepliesCount, repliesCount: repliesCount })
        }

        return true


    }
    // clean all post, comment, and reaction
    async cleanAllPost(): Promise<boolean> {

        let posts = await this.postRepository.find({ where: { postId: IsNull(), isPsychoeducation: false } })

        // loop each member
        for (let index = 0; index < posts.length; index++) {
            const post = posts[index];

            // delete post
            await this.postRepository.softRemove(post)
        }

        return true

    }


    // send point to mmid
    async sendPointToMMID(postId: number): Promise<boolean> {
        // get post
        const query = await this.postRepository.find(
            {
                where: {
                    id: postId,
                    deleted_at: IsNull()
                },
                take: 1,
                relations: ['member', 'reactionList', 'reactionList.member', 'medias', 'space']
            }
        )
        if (query.length == 0) {
            return false
        }

        console.log(query)

        const url = process.env.KTB_SERVER + '/d3v/custom-file-processor/mimate-post';
        const token = Buffer.from('ktb:384@#kdsd').toString('base64');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${token}`,
        };

        try {
            console.log(`Sending POST to ${url} with payload:`, JSON.stringify(query[0]));
            const response = await axios.post(url, query[0], { headers });
            console.log('Response status:', response.status);
            console.log('Response data:', response.data);
            return true;
        } catch (error) {
            console.error('Error sending point to MMID:', error.response?.data || error.message);
            return false;
        }
    }

}
