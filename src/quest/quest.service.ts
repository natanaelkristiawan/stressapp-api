import { LeaderboardService } from 'src/leaderboard/leaderboard.service';
import { periodOf } from 'src/leaderboard/leaderboard.rules';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Quest } from 'src/entity/quest.entity';
import { LessThan, MoreThan, Repository, Between, Not, IsNull, In, EntityManager } from 'typeorm';
import { QuestDetailInterface, QuestInterface, QuestList } from './interfaces/quest.interface';
import { LeaderboardInterface, LeaderboardItemInterface } from './interfaces/leaderboard.interface';
import { LeaderboardDTO } from './dtos/leaderboard.dto';
import { QuestPoint } from 'src/entity/quest-point.entity';
import { PointSource, QuestPointDetail } from 'src/entity/quest-point-detail.entity';
import { CommentEntity } from 'src/entity/comment.entity';
import { PostEntity } from 'src/entity/post.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { ReactionEntity } from 'src/entity/reaction.entity';
import { Activity } from 'src/entity/activity.entity';
import { AdminSettingService } from 'src/admin-setting/admin-setting.service'


interface ParamQuestExist {
    memberId: number;
    questId: number;
    commentId?: number;
    reactionId?: number;
    postId?: number;
}

interface ParamQuestSetPoint {
    memberId: number;
    questId: number;
    point: number;
    source: string;
    postId?: number;
    commentId?: number;
    reactionId?: number;
    note?: string;
}


@Injectable()
export class QuestService {

    // repo 
    constructor(
        @InjectRepository(Quest, 'mimate')
        private questRepository: Repository<Quest>,

        @InjectRepository(QuestPoint, 'mimate')
        private questPointRepository: Repository<QuestPoint>,

        @InjectRepository(QuestPointDetail, 'mimate')
        private questPointDetailRepository: Repository<QuestPointDetail>,

        @InjectRepository(UserMimateEntity, 'mimate')
        private userMimateRepository: Repository<UserMimateEntity>,

        @InjectRepository(PostEntity, 'mimate')
        private postRepository: Repository<PostEntity>,

        @InjectRepository(CommentEntity, 'mimate')
        private commentRepository: Repository<CommentEntity>,

        @InjectRepository(ReactionEntity, 'mimate')
        private reactionRepository: Repository<ReactionEntity>,

        @InjectRepository(Activity, 'mimate')
        private activityRepository: Repository<Activity>,


        private readonly leaderboard: LeaderboardService,
        private AdminSettingService: AdminSettingService

    ) { }


    // convert date from 2025-06-17 to 17 Jun 2025
    formatDate(date: string | Date): string {
        const dateObj = new Date(date);
        return dateObj.toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // available quest

    async getAvailableQuestList(): Promise<QuestInterface> {

        // date now
        const dateNow = new Date();

        // find and count, order by dateEnd desc
        const [list, total] = await this.questRepository.findAndCount({
            where: {
                dateStart: LessThan(dateNow),
                dateEnd: MoreThan(dateNow),
                status: 1,
                isMain: 0,
            },
            order: {
                dateEnd: 'DESC',
            },
        });

        // take only 3
        const take = list.slice(0, 3);

        // map as interface
        const data: QuestList[] = take.map(quest => ({
            id: quest.id,
            title: quest.title,
            description: quest.description,
            image: quest.image,
            dateStart: this.formatDate(quest.dateStart),
            dateEnd: this.formatDate(quest.dateEnd),
        }));

        return {
            total,
            list: data
        };
    }

    // get all available quest
    async getAllAvailableQuest(): Promise<QuestList[]> {

        // date now
        const dateNow = new Date();

        // find and count, order by dateEnd desc
        const [list, total] = await this.questRepository.findAndCount({
            where: {
                dateStart: LessThan(dateNow),
                dateEnd: MoreThan(dateNow),
                status: 1,
                isMain: 0,
            },
            order: {
                dateEnd: 'DESC',
            },
        });

        const data: QuestList[] = list.map(quest => ({
            id: quest.id,
            title: quest.title,
            description: quest.description,
            image: quest.image,
            dateStart: this.formatDate(quest.dateStart),
            dateEnd: this.formatDate(quest.dateEnd),
        }));

        return data;
    }



    // get quest by id
    async getQuestById(id: number): Promise<QuestDetailInterface> {

        // date now
        const dateNow = new Date();

        // find quest by id
        const quest = await this.questRepository.findOne({ where: { id, dateStart: LessThan(dateNow), dateEnd: MoreThan(dateNow), status: 1 }, relations: ['createdBy'] });

        // check if quest is found
        if (!quest) {
            throw new NotFoundException('Quest not found');
        }


        // return interface
        return {
            id: quest.id,
            title: quest.title,
            description: quest.description,
            image: quest.image,
            dateStart: this.formatDate(quest.dateStart),
            dateEnd: this.formatDate(quest.dateEnd),
            created: {
                name: quest.createdBy.name,
                id: quest.createdBy.id,
                email: quest.createdBy.email,
                profilePictureUrl: quest.createdBy.profilePictureUrl,
                is_dealer: quest.createdBy.is_dealer,
            },
        };
    }

    // leaderboard
    async getLeaderboard(dto: LeaderboardDTO, memberId: number): Promise<LeaderboardInterface> {
        const MAX_TOTAL = 100;

        const limit = dto.limit || 10;
        const page = dto.page || 1;


        // total data grab
        const dataNow = limit * page;

        if (dataNow > MAX_TOTAL) {
            return {
                data: [],
                total: MAX_TOTAL,
                page: page,
                limit: limit,
            };
        }


        // get raw total
        const rawTotal = await this.questPointRepository.count({
            where: {
                totalPoints: MoreThan(0),
            },
        });

        // limit total to max 100
        const total = Math.min(rawTotal, MAX_TOTAL);

        // ensure we don't fetch beyond the allowed total
        const maxSkip = Math.floor((total - 1) / limit) * limit;
        const skip = Math.min((page - 1) * limit, maxSkip);

        const data = await this.questPointRepository.find({
            where: {
                totalPoints: MoreThan(0),
            },
            order: {
                totalPoints: 'DESC',
            },
            skip: skip,
            take: limit,
            relations: ['member'],
        });

        const leaderboard: LeaderboardItemInterface[] = data.map(item => ({
            id: item.id,
            name: item.member.name,
            point: item.totalPoints,
            is_owner: item.member.id === memberId,
        }));

        return {
            data: leaderboard,
            total: total,
            page: dto.page,
            limit: dto.limit,
        };
    }


    // get quest
    async getQuest(key: string): Promise<Quest> {
        // find key
        const quest = await this.questRepository.findOne({ where: { action: key, status: 1 } });

        // check if quest is found
        if (!quest) {

            // create log dont
            throw new NotFoundException('Quest not found');
        }

        return quest;

    }

    // quest already get point
    async questAlreadyGetPoint(params: ParamQuestExist, manager?: EntityManager): Promise<boolean> {
        const questRepo = manager ? manager.getRepository(Quest) : this.questRepository;
        const detailRepo = manager ? manager.getRepository(QuestPointDetail) : this.questPointDetailRepository;

        // split params
        const { memberId, questId, commentId, reactionId, postId } = params;



        let where: any = {
            member: { id: memberId },
            quest: { id: questId },
        }

        if (commentId) {
            where['comment'] = { id: commentId }

        }

        if (reactionId) {
            where['reaction'] = { id: reactionId }

        }

        if (postId) {
            where['post'] = { id: postId }

        }

        // find quest data detail
        const quest = await questRepo.findOneBy({ id: questId })

        // check here if interval is daily, user already  make point or yet
        if (quest.interval == 'daily') {
            // date now is GMT +8 date start add 00:00:00 and date end add 23:59_59
            const now = new Date();
            const gmt8Offset = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
            const gmt8Time = new Date(now.getTime() + gmt8Offset);

            const dateStart = new Date(gmt8Time);
            dateStart.setUTCHours(0, 0, 0, 0);
            dateStart.setTime(dateStart.getTime() - gmt8Offset);

            const dateEnd = new Date(gmt8Time);
            dateEnd.setUTCHours(23, 59, 59, 999);
            dateEnd.setTime(dateEnd.getTime() - gmt8Offset);




            let rules = await detailRepo.findOne({
                where: {
                    created_at: Between(dateStart, dateEnd),
                    member: {
                        id: memberId,
                    },
                    quest: {
                        id: questId
                    }
                }
            });

            if (rules) {
                return true;
            }


        }

        // find quest point detail
        const questPointDetail = await detailRepo.findOne({ where });


        // check if quest point detail is found
        if (questPointDetail) {
            return true;
        }



        return false;
    }


    // check if campaign period is active
    async isCampaignActive(): Promise<boolean> {
        try {
            const { value: available_data } = await this.AdminSettingService.getSettingByKey('campaign_period');
            if (available_data) {
                const { date_start, date_end } = JSON.parse(available_data);
                if (date_start && date_end) {
                    const now = new Date();
                    const startDate = new Date(date_start.includes('T') ? date_start : `${date_start}T00:00:00`);
                    const endDate = new Date(date_end.includes('T') ? date_end : `${date_end}T23:59:59.999`);

                    return now >= startDate && now <= endDate;
                }
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    // quest set point
    async questSetPoint(params: ParamQuestSetPoint): Promise<boolean> {
        const isCampaignActive = await this.isCampaignActive();
        if (!isCampaignActive) {
            return true;
        }

        const { memberId, questId, point, source, commentId, reactionId, postId, note } = params;
        const now = new Date();
        await this.questPointRepository.manager.transaction(async manager => {
            if (this.leaderboard.enabled) await this.leaderboard.lockPeriod(manager, periodOf(now));
            // Serialize the first insert and all point mutations on an existing member row.
            await manager.getRepository(UserMimateEntity).findOne({
                where: { id: memberId }, lock: { mode: 'pessimistic_write' },
            });
            const quest = await manager.getRepository(Quest).findOneBy({ id: questId });
            if (quest?.action?.startsWith('olympic_')) {
                // Olympic rewards are per interaction; do not apply the daily cap.
                const duplicate = await manager.getRepository(QuestPointDetail).findOne({ where: {
                    member_id: memberId, quest_id: questId,
                    post_id: postId || IsNull(), comment_id: commentId || IsNull(), reaction_id: reactionId || IsNull(),
                } });
                if (duplicate) return;
            } else if (quest && await this.questAlreadyGetPoint({ memberId, questId, postId, commentId, reactionId }, manager)) {
                return;
            }
            const repo = manager.getRepository(QuestPoint);
            const existing = await repo.findOne({ where: { memberId } });
            if (existing) await repo.increment({ id: existing.id }, 'totalPoints', point);
            else await repo.save({ memberId, totalPoints: point, updatedAt: now });
            const detail = await manager.getRepository(QuestPointDetail).save({
                member_id: memberId, quest_id: questId, points: point,
                source: source as PointSource, note: note || '', created_at: now,
                post_id: postId || null, comment_id: commentId || null, reaction_id: reactionId || null,
            });
            await this.leaderboard.record(manager, detail);
        });
        return true;
    }


    // point member
    async pointMember(memberId: number, name: string): Promise<{ name: string, rank: number, point: number, finish: number }> {
        // get quest point by member
        const questPoint = await this.questPointRepository.findOne({ where: { memberId: memberId } });

        // check if quest point is found
        if (!questPoint) {
            return {
                name: name,
                rank: 0,
                point: 0,
                finish: 0
            };
        }
        // take 10 member with highest point
        const members = await this.questPointRepository.find({
            order: {
                totalPoints: 'DESC',
            },
            take: 10,
        });

        // compare questPoint with members
        const rank = members.findIndex(member => member.id === questPoint.id);

        // return rank
        return {
            name: name,
            rank: rank + 1,
            point: questPoint.totalPoints,
            finish: 0
        };

    }

    // send quest share post 
    async sendQuestSharePost(memberId: number, postId: number): Promise<boolean> {


        // add in activity
        await this.activityRepository.save({
            userId: memberId,
            action: 'share',
            postId: postId,
            targetType: 'post',
            createdAt: new Date(),
        });

        let post = await this.postRepository.findOne({
            where: {
                id: postId
            },
            relations: ["member"]
        })

        if (post.member.id == memberId) {
            return false
        }
        // update shares count
        await this.postRepository.update({ id: postId }, { sharesCount: () => 'sharesCount + 1' })


        // update shares count
        await this.userMimateRepository.update({ id: memberId }, { total_shares: () => 'total_shares + 1' })


        let questKey = 'default_share_post';

        let detailQuest = await this.getQuest(questKey)

        let isAlreadyGetPoint = await this.questAlreadyGetPoint({ memberId: memberId, questId: detailQuest.id, postId: postId });
        if (isAlreadyGetPoint) {
            return false
        }




        await this.questSetPoint({
            memberId: memberId,
            questId: detailQuest.id,
            point: detailQuest.point,
            source: 'quest',
            postId: postId,
            note: 'Get point for share point'
        })

        return true;
    }

    async collectUsers(): Promise<any> {
        const members = await this.userMimateRepository
            .createQueryBuilder('user')
            .select('user.id')
            .where("user.name IS NOT NULL AND user.name != '' AND user.name != '-'")
            .andWhere("user.hobby IS NOT NULL AND user.hobby != '' AND user.hobby != '-'")
            .andWhere("user.bio IS NOT NULL AND user.bio != '' AND user.bio != '-'")
            .getMany();

        return members.map(m => m.id);
    }



    // send quest complete profie   
    async sendQuestCompleteProfile(memberId: number): Promise<boolean> {

        let questKey = 'default_complete_mimate_profile';

        let detailQuest = await this.getQuest(questKey)

        // get profile
        let profile = await this.userMimateRepository.findOne({ where: { id: memberId } })

        // check if profile is null
        if (!profile) {
            return false
        }

        // Profile completion now uses the locally owned fields.
        if (!profile.bio || !profile.hobby || !profile.name) {
            return false;
        }

        let isAlreadyGetPoint = await this.questAlreadyGetPoint({ memberId: memberId, questId: detailQuest.id });
        if (isAlreadyGetPoint) {
            return false
        }

        await this.questSetPoint({
            memberId: memberId,
            questId: detailQuest.id,
            point: detailQuest.point,
            source: 'quest',
            postId: null,
            note: 'Get point for activated account'
        })

        return true;
    }

    // decrease point
    async decreasePoint(email: string, points: number, reason: string): Promise<boolean> {
        // find member by email
        const member = await this.userMimateRepository.findOne({ where: { email } });

        // check if member is found
        if (!member) {
            throw new NotFoundException('Member not found');
        }

        await this.deduct(member.id, points, reason, false);
        return true;
    }


    // decrease point
    async decreasePointById(id: number, points: number, reason: string): Promise<boolean> {
        // find member by email
        const member = await this.userMimateRepository.findOne({ where: { id } });

        // check if member is found
        if (!member) {
            throw new NotFoundException('Member not found');
        }

        // Validate points input
        if (points <= 0) {
            throw new BadRequestException('Points to deduct must be greater than 0');
        }

        await this.deduct(member.id, points, reason, true);
        return true;
    }




    private async deduct(memberId: number, points: number, reason: string, strict: boolean) {
        if (!Number.isSafeInteger(points) || points <= 0) throw new BadRequestException('Points to deduct must be a positive integer');
        await this.questPointRepository.manager.transaction(async manager => {
            await manager.getRepository(UserMimateEntity).findOne({ where: { id: memberId }, lock: { mode: 'pessimistic_write' } });
            const repo = manager.getRepository(QuestPoint);
            const row = await repo.findOne({ where: { memberId } });
            const current = row?.totalPoints || 0;
            if (strict && points > current) throw new BadRequestException(`Cannot deduct more points than available. Available: ${current}, Requested: ${points}`);
            await repo.save({ ...row, memberId, totalPoints: Math.max(0, current - points), updatedAt: new Date() });
            // Existing category rules count only positive history; deductions do not change HOF.
            await manager.getRepository(QuestPointDetail).save({ member_id: memberId, quest_id: null,
                points: -points, source: PointSource.OTHER, note: reason || 'Point decreased', created_at: new Date() });
        });
    }
}
