import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity } from 'src/entity/post.entity';
import { ReactionEntity } from 'src/entity/reaction.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { Reaction } from './interfaces/reaction.interface';
import { IsNull, Repository } from 'typeorm';  
import { ActivityService } from 'src/activity/activity.service';
import { UserFollowEntity } from 'src/entity/user-follow.entity';

@Injectable()
export class ReactionService {
    constructor(
        @InjectRepository(ReactionEntity, 'mimate')
        private readonly reactionRepository: Repository<ReactionEntity>,
        @InjectRepository(PostEntity, 'mimate')
        private readonly postRepository: Repository<PostEntity>,
        @InjectRepository(UserMimateEntity, 'mimate')
        private readonly memberRepository: Repository<UserMimateEntity>,
        @InjectRepository(UserFollowEntity, 'mimate')
        private readonly userFollow: Repository<UserFollowEntity>,
        private readonly activityService: ActivityService
    ) {}

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

      // clean all reaction
      async cleanAllReaction():Promise<boolean> {
        // delete all reaction
        let reactions = await this.reactionRepository.find({where: {reactionId:IsNull()}})

        // loop each reaction
        for (let index = 0; index < reactions.length; index++) {
            const reaction = reactions[index];
            // delete reaction
            await this.reactionRepository.softRemove(reaction)
        }

        return true
    }

    async createReaction(post_id: number, type: string, member_id: number): Promise<Reaction> {
        
        let modeCreate = false
        
        // find post by post_id
        const post = await this.postRepository.findOne({
            where: {
                id: post_id
            },
            relations: ['member']
        })

        if (!post) {
            throw new NotFoundException('Post not found')
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

        // find reaction by post_id and member_id
        let reaction = await this.reactionRepository.findOne({
            where: {
                post: post,
                member: {
                    id: member_id
                }
            },
            relations: ['member']
        })

        let name = this.getMemberName(member.name, member.mmid_fullname, member.id)

        let dateCurl = new Date()
        let utc7 = new Date(dateCurl.toLocaleString('en-US', { timeZone: 'Asia/Makassar' }));
                

        if (reaction) {
            // update reaction
            reaction.reaction = type
            reaction.updated_at = utc7

        } else {
            // create new reaction
            reaction = new ReactionEntity()
            reaction.post = post
            reaction.member = member
            reaction.reaction = type
            reaction.created_at = utc7
            reaction.updated_at = utc7

            modeCreate = true
 
        }

        let query = await this.reactionRepository.save(reaction)

        if(modeCreate) {
            // update total_like in member
            await this.memberRepository.update({id:member_id}, {total_likes: () => 'total_likes + 1'})    

        }

        // calcult total reaction in post
        let totalReaction = await this.getTotalReactionInPost(post_id)
        // update in post
        await this.postRepository.update(post_id, {
            reactionsCount: totalReaction
        })


        

        return {
            id: query.id,
            reaction: query.reaction,
            member: {
                id: query.member.id,
                name: name,
                profilePictureUrl: query.member.profilePictureUrl
            },
            post_id:post_id,
            post_member_id : post.member.id,
            post_member: post.member.userId
        }
    }


    // create delete reaction
    async deleteReaction(member_id: number, post_id: number): Promise<boolean> {
        
        // find reaction by reaction_id
        let reaction = await this.reactionRepository.findOne({
            where: {
                post: {id: post_id},
                member: {id: member_id}
            },
            relations: ['member', 'post']
        })

        // compare member_id with reaction.member.id
        if (reaction.member.id !== member_id) {
            throw new ForbiddenException('You are not allowed to delete this reaction')
        }

        // save activity
        await this.activityService.createActivity({
            userId: member_id,
            action: 'delete',
            reactionId: reaction.id,
            postId: reaction.post.id,
            targetType: 'reaction'
        })


        let query = await this.reactionRepository.softDelete({  id: reaction.id, member:{id:member_id} })

        // calcult total reaction in post
        let totalReaction = await this.getTotalReactionInPost(reaction.post.id)
        // update in post
        await this.postRepository.update(reaction.post.id, {
            reactionsCount: totalReaction
        })

        if(reaction.member.total_likes > 0) {
            // update total_like in member
            await this.memberRepository.update({id:member_id}, {total_likes: () => 'total_likes - 1'})  
        }




        if (query.affected === 0) {
            throw new NotFoundException('Reaction not found')
        }

        return true
    }


    // find reaction by post_id sort by created_at desc
    async getReactionByPostId(post_id: number, type: string, member_id:number): Promise<Reaction[]> {

        // filter if type is all then get all reaction
        let param:{
            post: { id: number },
            reaction?: string
        } = {
            post: { id: post_id }
        }
        
        if(type != 'all') {
           param.reaction = type
        } 



        // find reaction by param
        let query = await this.reactionRepository.find({
            where: param,
            relations: ['member', 'post'],
            order: { created_at: 'DESC' }
        })

        let result:Reaction[] = []

        for (let index = 0; index < query.length; index++) {
            const item = query[index];

            const found = await this.userFollow.findOne({
              where: {
                followerId: member_id,
                followingId: item.member.id
              }
            })
            const isFollowUserAccess = !!found

            result.push({
                id: item.id,
                reaction: item.reaction,
                member: {
                    id: item.member.id,
                    name: this.getMemberName(item.member.name, item.member.mmid_fullname, item.member.id),
                    profilePictureUrl: item.member.profilePictureUrl,
                    bio: item.member.bio
                },
                post_id: item.post.id,
                isFollow: isFollowUserAccess

            })
            
        }


        

        // // filter in interface
        // let result: Reaction[] = query.map(item => ({
        //     id: item.id,
        //     reaction: item.reaction,
        //     member: {
        //         id: item.member.id,
        //         name: this.getMemberName(item.member.name, item.member.mmid_fullname, item.member.id),
        //         profilePictureUrl: item.member.profilePictureUrl,
        //         bio: item.member.bio
        //     },
        //     post_id: item.post.id
        // }))
        
        return result
    }


    // cacluct total reaction in post
    async getTotalReactionInPost(post_id: number): Promise<number> {
        let query = await this.reactionRepository.count({
            where: { post: { id: post_id } }
        })
        return query
    }


    // reaction sync
    async syncAllReaction(): Promise<{}> {
        const posts = await this.postRepository.find()

        for(let post of posts) {
            await this.getTotalReactionInPost(post.id)
        }

        return true
    }


    // clean all comment
    async cleanAllComment():Promise<boolean> {

        // grab member with condition
        let members = await this.memberRepository.find({where: {memberId:IsNull()}})

        // loop each member
        for (let index = 0; index < members.length; index++) {
            const member = members[index];
            // find comment by member
            let comments = await this.reactionRepository.find({where: {member: {id: member.id}}})

            // loop each comment
            for (let index = 0; index < comments.length; index++) {
                const comment = comments[index];
                // delete comment
                await this.reactionRepository.softRemove(comment)
            }
                
        }

        return true
    
    }


    async injectReaction():Promise<boolean> {
        let dataReaction = [
            {"id":56070,"backup_member":79916,"backup_post_with_attribute_id":25018},
            {"id":56071,"backup_member":94651,"backup_post_with_attribute_id":25018},
            {"id":56073,"backup_member":63190,"backup_post_with_attribute_id":25018},
            {"id":56074,"backup_member":90701,"backup_post_with_attribute_id":25018},
            {"id":56075,"backup_member":158492,"backup_post_with_attribute_id":25018},
            {"id":56081,"backup_member":41970,"backup_post_with_attribute_id":25018},
            {"id":56082,"backup_member":189188,"backup_post_with_attribute_id":25018},
            {"id":56083,"backup_member":200673,"backup_post_with_attribute_id":25018},
            {"id":56084,"backup_member":200519,"backup_post_with_attribute_id":25018},
            {"id":56085,"backup_member":213502,"backup_post_with_attribute_id":25018},
            {"id":56087,"backup_member":106919,"backup_post_with_attribute_id":25018},
            {"id":56088,"backup_member":204759,"backup_post_with_attribute_id":25018},
            {"id":56089,"backup_member":13934,"backup_post_with_attribute_id":25018},
            {"id":56090,"backup_member":20434,"backup_post_with_attribute_id":25018},
            {"id":56091,"backup_member":213099,"backup_post_with_attribute_id":25018},
            {"id":56092,"backup_member":68495,"backup_post_with_attribute_id":25018},
            {"id":56093,"backup_member":209161,"backup_post_with_attribute_id":25018},
            {"id":56094,"backup_member":208993,"backup_post_with_attribute_id":25018},
            {"id":56096,"backup_member":98598,"backup_post_with_attribute_id":25018},
            {"id":56097,"backup_member":26610,"backup_post_with_attribute_id":25018},
            {"id":56099,"backup_member":108106,"backup_post_with_attribute_id":25018},
            {"id":56100,"backup_member":29360,"backup_post_with_attribute_id":25018},
            {"id":56101,"backup_member":143512,"backup_post_with_attribute_id":25018},
            {"id":56104,"backup_member":50493,"backup_post_with_attribute_id":25018},
            {"id":56106,"backup_member":207524,"backup_post_with_attribute_id":25018},
            {"id":56107,"backup_member":199979,"backup_post_with_attribute_id":25018},
            {"id":56108,"backup_member":35773,"backup_post_with_attribute_id":25018},
            {"id":56116,"backup_member":90804,"backup_post_with_attribute_id":25018},
            {"id":56118,"backup_member":107896,"backup_post_with_attribute_id":25018},
            {"id":56122,"backup_member":85157,"backup_post_with_attribute_id":25018},
            {"id":56123,"backup_member":106457,"backup_post_with_attribute_id":25018},
            {"id":56135,"backup_member":214266,"backup_post_with_attribute_id":25018},
            {"id":56136,"backup_member":22341,"backup_post_with_attribute_id":25018},
            {"id":56138,"backup_member":121751,"backup_post_with_attribute_id":25018},
            {"id":56139,"backup_member":195845,"backup_post_with_attribute_id":25018},
            {"id":56140,"backup_member":1301,"backup_post_with_attribute_id":25018},
            {"id":56141,"backup_member":22153,"backup_post_with_attribute_id":25018},
            {"id":56142,"backup_member":94643,"backup_post_with_attribute_id":25018},
            {"id":56143,"backup_member":184346,"backup_post_with_attribute_id":25018}
          ]

          for (const data of dataReaction) {

            // find post
            let post = await this.postRepository.findOneBy({id:data.backup_post_with_attribute_id})

            if(post){
             
                let comment = await this.reactionRepository.findOneBy({id:data.id}) 

                if(comment) {
    
                    await this.activityService.createActivity({
                        userId: data.backup_member,
                        action: 'create',
                        postId: data.backup_post_with_attribute_id,
                        reactionId: data.id,
                        targetType: 'reaction'
                    })
                }  else {
                }
            } else {
            }
         
        }

        return true

          return true
    }
  
}
