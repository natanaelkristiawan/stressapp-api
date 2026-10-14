import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { UserEntity } from 'src/entity/user.entity';
import { In, IsNull, Not, Repository } from 'typeorm';
import { MemberFollowInterface, profile } from './interfaces/profile.interface';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UserFollowEntity } from 'src/entity/user-follow.entity';
import { MemberSpaceEntity } from 'src/entity/member-spaces.entity';
import { Redis } from 'ioredis';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { DateHelper } from 'src/common/helpers/date.helper';
import { PostEntity } from 'src/entity/post.entity';
import { CommentEntity } from 'src/entity/comment.entity';
import { ReactionEntity } from 'src/entity/reaction.entity';
import { UserVehicleEntity } from 'src/entity/vehicle.entity';
import { CarEntity } from 'src/entity/car.entity';

@Injectable()
export class ProfileService {
    private deeplink: string
    private redis: Redis;
    constructor(
        @InjectRepository(UserMimateEntity, 'mimate')
        private userMimateRepository: Repository<UserMimateEntity>,


        @InjectRepository(UserFollowEntity, 'mimate')
        private followRepository: Repository<UserFollowEntity>,

        @InjectRepository(UserEntity, 'mmid')
        private userMmidRepository: Repository<UserEntity>,

        @InjectRepository(UserVehicleEntity, 'mmid')
        private userVehicleRepository: Repository<UserVehicleEntity>,

        @InjectRepository(CarEntity, 'mmid')
        private carRepository: Repository<CarEntity>,


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

        const vehicles = await this.userVehicleRepository.find({
            where: { user_id: userMimate.userId },
            relations: { car: true }, // same as ['car'], but typed
        });


        vehicleList = vehicles.map(v => v.car?.brand_name || '');


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

    
}
