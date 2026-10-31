import { recordNotificationEvent } from '../notification-events/record-notification-event';
import { NotificationType } from '../entity/member-notification.entity';
import { ContentModerationService } from '../content-moderation/content-moderation.service';
import { assertPostInteractionsVisible } from '../post/post-visibility';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm'; 
import { IsNull, Not, Repository } from 'typeorm';
import { CommentEntity } from 'src/entity/comment.entity';
import { CommentCollectionResponse, CommentInterface, CommentReactionInterface } from './interfaces/comment.interface';
import { Information } from 'src/post/interfaces/post.interface';
import {Redis} from 'ioredis';
import { v1 as uuidv1} from 'uuid';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { PostEntity } from 'src/entity/post.entity';
import { DateHelper } from 'src/common/helpers/date.helper';
import { UpdateCommentDto } from './dtos/update-comment.dto';
import { CommentReactionEntity } from 'src/entity/comment-reaction.entity';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { ActivityService } from 'src/activity/activity.service';


@Injectable()
export class CommentService {

    private readonly redis: Redis;

    constructor(
        @InjectRepository(CommentEntity, 'mimate')
        private readonly commentRepository: Repository<CommentEntity>,
        @InjectRepository(UserMimateEntity, 'mimate')
        private userMimateRepository: Repository<UserMimateEntity>,
        @InjectRepository(PostEntity, 'mimate')
        private postRepository: Repository<PostEntity>,
        // reaction entity
        @InjectRepository(CommentReactionEntity, 'mimate')
        private readonly commentReactionRepository: Repository<CommentReactionEntity>,
        private readonly dateHelper: DateHelper,
        private readonly redisService: RedisService,
        private readonly activityService: ActivityService,
        private readonly moderation: ContentModerationService,
    ) {
        this.redis = this.redisService.getOrNil('default')
        if (!this.redis) {
            console.warn('Redis client not found. Skipping cache initialization.');
        }
    }

     // clean all comment
     async cleanAllComment():Promise<boolean> {

        // grab member with condition
        let comments = await this.commentRepository.find({where: {commentId:IsNull(), post: { isPsychoeducation: false }}})

        // loop each member
        for (let index = 0; index < comments.length; index++) {
            const comment = comments[index];
            // find comment by member
           
            // loop each comment
            // delete comment
            await this.commentRepository.softRemove(comment)
        }

        return true
    
    }

    private getMemberName(name:string, mmid_fullname:string,  id:number): string {

        let tempName = name
        if (!tempName || tempName.trim() === '' || tempName == null) {
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

    async getComments(post_id: number, limit: number, after: string, userId: number): Promise<CommentCollectionResponse> {
        assertPostInteractionsVisible(await this.postRepository.findOneBy({ id: post_id }));
        let totalData = 0;
        let page = 1;
        let offset = 0;
        let cacheKey: string;
        let redisInfo: Information;
    
        if (after != '') {
          cacheKey = `${post_id}:comment:${after}`;
          const cachedInformation = await this.redis.get(cacheKey);
          if (cachedInformation) {
            redisInfo = JSON.parse(cachedInformation);
            totalData = redisInfo.totalData;
            page = redisInfo.page + 1;
            offset = redisInfo.page * redisInfo.limit;
          } else {
            after = uuidv1();
          }
        } else {
          after = uuidv1();
        }
    
        const where: any = {
          post: { id: post_id },
          parent: IsNull(),
          moderationStatus: 'approved',
        };
    
        const query = await this.commentRepository.find({
          where,
          order: { created_at: 'DESC' },
          relations: ['member', 'post'],
          take: limit,
          skip: offset,
        });
    
        totalData = await this.commentRepository.count({ where });
    
        const response: CommentInterface[] = [];
    
        for (const comment of query) {
          const reactions = await this.getReactions(comment.id, userId);
          const replies = await this.getAllRepliesFlat(comment.id, userId);
         
            //   if member is null skip
            if(!comment.member) {
                continue
            }

          let name = this.getMemberName(comment.member.name, comment.member.mmid_fullname, comment.member.id)

          response.push({
            id: comment.id,
            title: comment.title,
            description: comment.description,
            parent_id: null,
            post_id: comment.post.id,
            member: {
              id: comment.member.id,
              name: name,
              profilePictureUrl: comment.member.profilePictureUrl,
              userId: comment.member.userId,
            },
            comments: replies,
            published_at: comment.created_at,
            published_at_title: this.dateHelper.getDateRange(comment.created_at, new Date()),
            repliesCount: comment.repliesCount,
            reactions,
          });
        }
    
        redisInfo = {
          totalData,
          hasNext: totalData >= page * limit,
          page,
          limit,
          offset,
          after,
        };
    
        cacheKey = `${post_id}:comment:${after}`;
        await this.redis.set(cacheKey, JSON.stringify(redisInfo), 'EX', 60 * 5);
    
        return {
          totalData,
          hasNext: totalData >= page * limit,
          page,
          limit,
          offset,
          after,
          data: response,
        };
      }
    
      private async getAllRepliesFlat(commentId: number, userId: number): Promise<CommentInterface[]> {
        const replies = await this.commentRepository.find({
          where: {
            parent: { id: commentId },
            moderationStatus: 'approved',
          },
          relations: ['member', 'post'],
          order: { created_at: 'DESC' },
        });
    
        let flatReplies: CommentInterface[] = [];
    
        for (const reply of replies) {
          const reactions = await this.getReactions(reply.id, userId);
          const childReplies = await this.getAllRepliesFlat(reply.id, userId);
    
          let name = this.getMemberName(reply.member.name, reply.member.mmid_fullname, reply.member.id)

          flatReplies.push({
            id: reply.id,
            title: reply.title,
            description: reply.description,
            parent_id: reply.backup_comment_id || null,
            post_id: reply.post.id,
            member: {
              id: reply.member.id,
              name: name,
              profilePictureUrl: reply.member.profilePictureUrl,
              userId: reply.member.userId,
            },
            comments: [],
            published_at: reply.created_at,
            published_at_title: this.dateHelper.getDateRange(reply.created_at, new Date()),
            repliesCount: reply.repliesCount,
            reactions,
          });
    
          flatReplies = flatReplies.concat(childReplies);
        }
    
        return flatReplies;
      }
    
      private async getReactions(commentId: number, userId: number): Promise<CommentReactionInterface> {
        const reactions = await this.commentReactionRepository.find({
          where: { comment: { id: commentId } },
          relations: ['member'],
        });

        let reacted:boolean= false

        for (let index = 0; index < reactions.length; index++) {
            const element = reactions[index];
            if(element.member.id == userId) {
                reacted = true
            }
            
        }
    
        return {
          reaction: '+1',
          count: reactions.length,
          reacted: reacted,
        };
      }

    async manipulatedComment(): Promise<any> {


        // find comment with parent id not null
        const comments = await this.commentRepository.find({
            where: {
                parent: Not(IsNull())
            },
            relations: ['member'],
        })

        // loop for each comment and get the externalId
        for(let comment of comments) {
            const member = await this.userMimateRepository.findOne({
                where: {
                    externalId: comment.externalId
                }
            })

            if(member) {
                comment.member = member
            }

            await this.commentRepository.save(comment)
        }

        return {
            message: 'Success get comments'
        }
    }

    private  shortenText(text:string, wordLimit = 20) {
        const words = text.trim().split(/\s+/);
        return words.slice(0, wordLimit).join(" ") + (words.length > wordLimit ? "..." : "");
    }

    async getPostDetail(post_id:number) {
        return await this.postRepository.findOneBy({id:post_id});
    }

    async getCommentDetail(comment_id: number) {
        return await this.commentRepository.findOne({
            where: { id: comment_id },
            relations: ['member'],
        });
    }



    async createComment(body: CreateCommentDto, memberId: number, authorizedCmsAdmin = false): Promise<CommentInterface> {
        const {post_id, comment_id, content} = body



        const post = await this.postRepository.findOne({
            where: {
                id: post_id
            },
            relations: ['member']
        })

        assertPostInteractionsVisible(post);
        const moderation = await this.moderation.assertPublishable([content], memberId, authorizedCmsAdmin);
        let parent:CommentEntity|null = null



        if(comment_id) {
            
            parent = await this.commentRepository.findOne({
                where: {
                    id: comment_id,
                    post: { id: post_id }
                }
            })


            
            if (!parent) {
                throw new HttpException('Parent comment not found', HttpStatus.NOT_FOUND);
            }

        }

        if(!post) {
            throw new HttpException('Post not found', HttpStatus.NOT_FOUND)
        }

        const member = await this.userMimateRepository.findOne({
            where: {
                id: memberId
            }
        })

        let name = this.getMemberName(member.name, member.mmid_fullname, member.id)

        let insert:CommentEntity = {
            moderation,
            title: this.shortenText(content),
            description: content,
            post: post,
            parent: parent,
            member: member,
            created_at: new Date(),
            updated_at: new Date(),
            externalId: member.externalId,
            repliesCount: 0
        }

        
        const save = await this.commentRepository.manager.transaction(async (manager) => {
            if (parent) {
                // Keep the counter and reply atomic, including concurrent replies.
                await manager.update(CommentEntity, { id: parent.id }, {
                    repliesCount: () => 'COALESCE(repliesCount, 0) + 1',
                });
            }
            const saved = await manager.save(CommentEntity, insert);
            if (!authorizedCmsAdmin && !post.isPsychoeducation) {
                await recordNotificationEvent(manager, NotificationType.CommentReply, saved.id);
            }
            return saved;
        });


        // update total_comment in member
        await this.userMimateRepository.update({id:memberId}, {total_comments: () => 'total_comments + 1'})    

    

        let response:CommentInterface = {
            id: save.id,
            title: save.title,
            description: save.description,
            parent_id: save.parent ? save.parent.id : null,
            post_id: save.post.id,
            member: {
                id: save.member.id,
                name: name,
                profilePictureUrl: save.member.profilePictureUrl,
                userId: save.member.userId
            },
            comments: [],
            published_at: save.created_at,  
            published_at_title: this.dateHelper.getDateRange(save.created_at, new Date()),
            repliesCount: 0,
            postOwnerUserId: post.member.userId,
            postOwnerId:post.member.id
        }


        await this.calculationTotalComment(post_id)

        return response
        
    }

    async syncAllComment() {
        const posts = await this.postRepository.find()

        for(let post of posts) {
            await this.calculationTotalComment(post.id)
        }

        return {
            message: 'Success sync all comment'
        }
    }


    // calculation total comment in post   
    private async calculationTotalComment(postId: number): Promise<boolean> {

        // get post
        const post = await this.postRepository.findOne({
            where: {
                id: postId
            }
        })
        

        const totalComment = await this.commentRepository.find({
            where: {
                post: {id: postId}
            },
            relations: [ 'parent']
        })

        // find total comment with parent is null
        const totalCommentWithParentNull = totalComment.filter(comment => comment.parent == null)

        // update totalRepliesCount in post

        

        // update totalRepliesCount in post
        post.totalRepliesCount = totalComment.length
        post.repliesCount = totalCommentWithParentNull.length
        await this.postRepository.save(post)




        return true
    }

    async updateComment(id: number, body: UpdateCommentDto, memberId: number, authorizedCmsAdmin = false): Promise<CommentInterface> {
        const {content} = body

        const comment = await this.commentRepository.findOne({
            where: {
                id: id
            },
            relations: ['member', 'post']   
        })

        assertPostInteractionsVisible(comment?.post);
        let name = this.getMemberName(comment.member.name, comment.member.mmid_fullname, comment.member.id) 

        if(comment.member.id != memberId) {
            throw new HttpException('You are not allowed to update this comment', HttpStatus.FORBIDDEN)
        }


        // check if post is deleted
        const post = await this.postRepository.findOne({
            where: {
                id: comment.post.id
            }
        })

        if(!post) {
            throw new HttpException('Post not found', HttpStatus.NOT_FOUND)
        }
    


        comment.moderation = await this.moderation.assertPublishable([content], memberId, authorizedCmsAdmin);
        comment.title = this.shortenText(content)
        comment.description = content
        comment.updated_at = new Date()

        await this.commentRepository.save(comment)

        let response:CommentInterface = {
            id: comment.id,
            title: comment.title,
            description: comment.description,
            parent_id: comment.parent ? comment.parent.id : null,
            post_id: comment.post.id,
            member: {
                id: comment.member.id,
                name: name,
                profilePictureUrl: comment.member.profilePictureUrl,
                userId: comment.member.userId
            },  
            comments: [],
            published_at: comment.created_at,
            published_at_title: this.dateHelper.getDateRange(comment.created_at, new Date()),
            repliesCount: comment.repliesCount
        }

        return response
    }

    async getCommentById(id: number): Promise<CommentEntity> {
        const comment = await this.commentRepository.findOne({
            where: {
                id: id
            },
            relations: ['member', 'post']
        })

        if(!comment) {
            throw new HttpException('Comment not found', HttpStatus.NOT_FOUND)
        }

        assertPostInteractionsVisible(comment.post);
        return comment
    }

    async deleteComment(memberId: number, comment: CommentEntity): Promise<boolean> {
        
        // get memberID detail
        const member = await this.userMimateRepository.findOne({
            where: {
                id: memberId
            }
        })

        // if member is admin, then can delete all comment
        if(member.member_role !== 1) {
            if(comment.member.id != member.id) {
                throw new HttpException('You are not allowed to delete this comment', HttpStatus.FORBIDDEN)
            }
        }

        // Recursively delete all replies first
        await this.deleteCommentReplies(comment.id)

        // Delete the main comment
        await this.commentRepository.softDelete(comment.id)

        if(member.total_comments > 0) {
            // update total_comment in member
            await this.userMimateRepository.update({id:memberId}, {total_comments: () => 'total_comments - 1'})    
        }

        // update total comment in post
        await this.calculationTotalComment(comment.post.id)

        return true
        
    }

    // Helper method to recursively delete all replies of a comment
    private async deleteCommentReplies(commentId: number): Promise<void> {
        // Find all direct replies to this comment
        const replies = await this.commentRepository.find({
            where: {
                parent: { id: commentId }
            },
            relations: ['member']
        });

        // Recursively delete all replies for each reply
        for (const reply of replies) {
            await this.deleteCommentReplies(reply.id);

            // skip if total_comments is 0
            if(reply.member.total_comments > 0) {
                // update total_comment in member
                await this.userMimateRepository.update({id:reply.member.id}, {total_comments: () => 'total_comments - 1'})    
            }
            await this.commentRepository.softDelete(reply.id);
        }
    }

    // add like comment
    async likeComment(memberId: number, commentId: number): Promise<boolean> {
        const comment = await this.commentRepository.findOne({
            where: {
                id: commentId
            }
        })

        if(!comment) {
            throw new HttpException('Comment not found', HttpStatus.NOT_FOUND)
        }

        return true
    }


    // sync comment admin, ID externalId = Vy5EDuHjUx
    async syncCommentAdmin(): Promise<boolean> {
        const comments = await this.commentRepository.find({
            where: {
                externalId: 'Vy5EDuHjUx'
            }
        })

        // find member with externalId = Vy5EDuHjUx
        const member = await this.userMimateRepository.findOne({
            where: {
                memberId: 'Vy5EDuHjUx'
            }
        })


        // loop for each comment and get the externalId
        for(let comment of comments) {
            // update comment with member id
            comment.member = member
            await this.commentRepository.save(comment)
        }
        return true
    }



       // kurang point

    async injectPointComment():Promise<boolean> {
        let dataComments = [
            {"id":43009,"backup_member":158492,"backup_post_with_attribute_id":25018},
            {"id":43010,"backup_member":63190,"backup_post_with_attribute_id":25018},
            {"id":43011,"backup_member":50493,"backup_post_with_attribute_id":25018},
            {"id":43012,"backup_member":200519,"backup_post_with_attribute_id":25018},
            {"id":43013,"backup_member":106919,"backup_post_with_attribute_id":25018},
            {"id":43014,"backup_member":20434,"backup_post_with_attribute_id":25018},
            {"id":43015,"backup_member":204759,"backup_post_with_attribute_id":25018},
            {"id":43016,"backup_member":208993,"backup_post_with_attribute_id":25018},
            {"id":43017,"backup_member":211660,"backup_post_with_attribute_id":25018},
            {"id":43018,"backup_member":26610,"backup_post_with_attribute_id":25018},
            {"id":43019,"backup_member":98598,"backup_post_with_attribute_id":25018},
            {"id":43020,"backup_member":215464,"backup_post_with_attribute_id":25018},
            {"id":43021,"backup_member":29360,"backup_post_with_attribute_id":25018},
            {"id":43022,"backup_member":50493,"backup_post_with_attribute_id":25018},
            {"id":43025,"backup_member":107896,"backup_post_with_attribute_id":25018},
            {"id":43026,"backup_member":90804,"backup_post_with_attribute_id":25018},
            {"id":43027,"backup_member":50493,"backup_post_with_attribute_id":25018},
            {"id":43029,"backup_member":85157,"backup_post_with_attribute_id":25018},
            {"id":43030,"backup_member":106457,"backup_post_with_attribute_id":25018},
            {"id":43031,"backup_member":63190,"backup_post_with_attribute_id":25018},
            {"id":43035,"backup_member":41970,"backup_post_with_attribute_id":25018},
            {"id":43036,"backup_member":195845,"backup_post_with_attribute_id":25018}
        ]

        for (const data of dataComments) {

            // find post
            let post = await this.postRepository.findOneBy({id:data.backup_post_with_attribute_id})

            if(post){
             
                let comment = await this.commentRepository.findOneBy({id:data.id}) 

                if(comment) {
    
                    await this.activityService.createActivity({
                        userId: data.backup_member,
                        action: 'create',
                        postId: data.backup_post_with_attribute_id,
                        commentId: data.id,
                        targetType: 'comment'
                    })
                }  else {
                }
            } else {
            }
         
        }

        return true
    }

}
