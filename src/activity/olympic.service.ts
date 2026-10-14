import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { QuestService } from 'src/quest/quest.service';
import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity } from 'src/entity/post.entity';
import { Repository } from 'typeorm';
@Injectable()
export class OlympicService {
    private redis: Redis; // Configure as needed
    constructor(
        @InjectRepository(PostEntity, 'mimate')
        private postRepository: Repository<PostEntity>,
        private readonly redisService: RedisService,
        private readonly questService: QuestService,
    ) {
        this.redis = this.redisService.getOrNil('default')
        if (!this.redis) {
            console.warn('Redis client not found. Skipping cache initialization.');
        }
    }

    // ponytail: unified inject helper to avoid triple-duplicated logic across post/comment/reaction
    private async injectPoint(params: {
        actionKey: string;
        postId: number;
        userId: number;
        commentId?: number;
        reactionId?: number;
        note: string;
    }): Promise<boolean> {
        try {
            const infoPoint = await this.questService.getQuest(params.actionKey);
            if (!infoPoint || infoPoint.status === 0) return false;

            const post = await this.postRepository.findOne({
                where: { id: params.postId },
                relations: ['member'],
            });

            if (!post?.member) return false;
            if (params.actionKey !== 'olympic_create_post' && post.member.id === params.userId) return false;

            await this.questService.questSetPoint({
                memberId: post.member.id,
                questId: infoPoint.id,
                point: infoPoint.point,
                source: 'quest',
                postId: params.postId,
                commentId: params.commentId,
                reactionId: params.reactionId,
                note: params.note,
            });

            return true;
        } catch {
            return false;
        }
    }

    async injectPointPost(postId: number, userId: number): Promise<boolean> {
        return this.injectPoint({
            actionKey: 'olympic_create_post',
            postId,
            userId,
            note: 'Get point for create post in olympic campaign',
        });
    }

    async injectPointComment(postId: number, userId: number, commentId: number): Promise<boolean> {
        return this.injectPoint({
            actionKey: 'olympic_create_comment',
            postId,
            userId,
            commentId,
            note: 'Get point for create comment post in olympic campaign',
        });
    }

    async injectPointReaction(postId: number, userId: number, commentId: number | null, reactionId: number | null): Promise<boolean> {
        return this.injectPoint({
            actionKey: 'olympic_create_reaction',
            postId,
            userId,
            commentId: commentId ?? undefined,
            reactionId: reactionId ?? undefined,
            note: 'Get point for create reaction post in olympic campaign',
        });
    }
}