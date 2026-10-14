import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommentReactionEntity } from 'src/entity/comment-reaction.entity';
import { CommentEntity } from 'src/entity/comment.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { Repository } from 'typeorm';
import { Reaction } from './interfaces/reaction.interface';
import { ActivityService } from 'src/activity/activity.service';
@Injectable()
export class CommentReactionService {

    // constructor commentReactionEntity, CommentEntity and UserMimateEntity
    constructor(
        @InjectRepository(CommentReactionEntity, 'mimate')
        private readonly commentReactionRepository: Repository<CommentReactionEntity>,
        @InjectRepository(CommentEntity, 'mimate')
        private readonly commentRepository: Repository<CommentEntity>,
        @InjectRepository(UserMimateEntity, 'mimate')
        private readonly memberRepository: Repository<UserMimateEntity>,
        private readonly activityService: ActivityService
    ) {}

    async createReaction(comment_id: number, type: string, member_id: number): Promise<Reaction> {
        
        // find comment id
        const comment = await this.commentRepository.findOne({
            where: {
                id: comment_id
            },
            relations: ['post', 'member']
        })

     
        

        if (!comment) {
            throw new NotFoundException('Comment not found')
        }

        // find member by member_id
        const member = await this.memberRepository.findOne({
            where: {
                id: member_id
            }
        })

        if (!member) {
            throw new NotFoundException('Member not found')
        }

        // find reaction by comment_id and member_id
        let reaction = await this.commentReactionRepository.findOne({
            where: {
                comment: comment,
                member: {
                    id: member_id
                }
            },
            relations: ['member', 'comment', 'comment.post']
        })

       
                
       
        if (reaction) {
            // update reaction
            reaction.reaction = type
            reaction.name = member.name
            reaction.updated_at = new Date()

        } else {
            // create new reaction
            reaction = new CommentReactionEntity()
            reaction.comment = comment
            reaction.member = member
            reaction.name = member.name
            reaction.reaction = type
            reaction.created_at = new Date()
            reaction.updated_at = new Date()
 
        }

        let query = await this.commentReactionRepository.save(reaction)

        // save activity
        await this.activityService.createActivity({
            userId: member_id,
            action: reaction ? 'reaction-update' : 'reaction-create',
            postId: comment.post.id,   
            commentId: comment_id,
            reactionId: query.id,
            targetType: 'comment'
        })

        return {
            id: query.id,
            reaction: query.reaction,
            member: {
                id: query.member.id,
                name: query.member.name,
                profilePictureUrl: query.member.profilePictureUrl
            },
            post_id: comment.post.id,
            comment_id: comment_id,
            comment_owner: comment.member.userId
        }
    }

    // create delete reaction
    async deleteReaction(member_id: number, comment_id: number): Promise<boolean> {
    
        // find reaction by reaction_id
        let reaction = await this.commentReactionRepository.findOne({
            where: {
                comment: {id: comment_id},
                member: {id: member_id}
            },
            relations: ['member', 'comment']
        })

        if(!reaction) {
            throw new NotFoundException('Reaction not found')
        }

        // compare member_id with reaction.member.id
        if (reaction.member.id !== member_id) {
            throw new ForbiddenException('You are not allowed to delete this reaction')
        }

        // save activity
        await this.activityService.createActivity({
            userId: member_id,
            action: 'reaction-delete',
            reactionId: reaction.id,
            commentId: reaction.comment.id,
            targetType: 'comment'
        })

        
        let query = await this.commentReactionRepository.softDelete({  id: reaction.id, member:{id:member_id} })

        if (query.affected === 0) {
            throw new NotFoundException('Reaction not found')
        }

        return true
    }


   // find reaction by comment_id sort by created_at desc
   async getReactionByCommentId(comment_id: number, type: string): Promise<Reaction[]> {

    let params:{
        comment: { id: number },    
        reaction?: string
    } = {
        comment: { id: comment_id }
    }

    if(type != 'all') {
        params.reaction = type
    }
    // get reaction by comment_id
    let reaction = await this.commentReactionRepository.find({
        where: params,
        relations: ['member', 'comment']
    })

    return reaction.map(item => ({
        id: item.id,
        reaction: item.reaction,
        member: {
            id: item.member.id,
            name: this.getMemberName(item.member.name, item.member.mmid_fullname, item.member.id),
            profilePictureUrl: item.member.profilePictureUrl
        },
        comment_id: comment_id,
    }))
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
    
}   