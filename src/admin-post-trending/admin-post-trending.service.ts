import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity } from 'src/entity/post.entity';
import { In, Not, Repository } from 'typeorm';
import { AdminPostTrendingDto, PostTrendingUpdateOrderDto } from './dtos/admin-post-trending.dto';
import { AdminPostTrendingInterface } from './interfaces/admin-post-trending.interface';
import { QueueService } from 'src/queue/queue.service';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';

@Injectable()
export class AdminPostTrendingService {
    constructor(
        @InjectRepository(PostEntity, 'mimate')
        private postRepository: Repository<PostEntity>,
        @InjectRepository(UserMimateEntity, 'mimate')
        private userMimateRepository:Repository<UserMimateEntity>,
        private readonly queueService: QueueService
    ) {}


    // list trending post
    async listTrendingPost():Promise<AdminPostTrendingInterface[]> {
        const posts = await this.postRepository.find({ where: { is_highlight: true, isPsychoeducation: false }, order: { order: 'ASC' } });
        return posts.map(post => ({
            id: post.id,
            title: post.title,
            createdAt: post.createdAt,
            order: post.order
        }));
    }

    // update order of trending post
    async updateOrder(updateOrderDto: PostTrendingUpdateOrderDto):Promise<AdminPostTrendingInterface[]> {
        // get post
        const posts = await this.postRepository.find({ where: { id: In(updateOrderDto.order.map(item => item.id)), isPsychoeducation: false } });
        // update order
        posts.forEach(post => {
            post.order = updateOrderDto.order.find(item => item.id === post.id)?.order;
        });
        await this.postRepository.save(posts);

        // return list trending post
        return this.listTrendingPost();
    }

    // search post
    async searchPost(searchDto: AdminPostTrendingDto):Promise<AdminPostTrendingInterface[]> {
        const { search } = searchDto;
        const query = this.postRepository.createQueryBuilder('post');
        query.where('LOWER(post.title) LIKE LOWER(:search)', { search: `%${search}%` });
        // limit only 10
        query.limit(10);
        // order by createdAt desc
        query.orderBy('post.createdAt', 'DESC');
        // select post.id, post.title, post.createdAt
        query.select(['post.id', 'post.title', 'post.createdAt']);
        const posts = await query.andWhere('post.isPsychoeducation = false').getMany();

        return posts.map(post => ({
            id: post.id,
            title: post.title,
            createdAt: post.createdAt
        }));
    }

    //    get all member except self
   private async getMemberExceptSelf(memberId:number):Promise<any> {
        // get all member
        let members = await this.userMimateRepository.find({select: {userId: true}, where: {id: Not(memberId)}})

         // member email
        // let email = [
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

    // set trending post
    async setTrendingPost(postId: number, order: number):Promise<AdminPostTrendingInterface> {
        // get post
        const post = await this.postRepository.findOne({ where: { id: postId, isPsychoeducation: false }, relations: ['member'] });
        if (!post) {
            throw new NotFoundException('Post not found');
        }
        // set trending
        post.is_highlight = true;
        post.order = order;
        await this.postRepository.save(post);

        // send notification to post owner
        await this.queueService.addJob('send-notification', {
            post_id: postId,
            type: 'post-notification-highlight',
            send_to: [post.member.id],
            actor_name: 'Admin'
        });


        //    get all members
       let memberExceptSelf = await this.getMemberExceptSelf(post.member.id)

        // send add job to queue
        for(let i = 0; i < memberExceptSelf.length; i++){

            let datasId = memberExceptSelf[i].map(item => item.userId) 
            // send add job to queue
            await this.queueService.addJob('send-notification', {
              type: 'post-notification-highlight-all-user',
              send_to: datasId,
              actor_name: post.member.name,
              post_id: post.id,
            })

        }


        return {
            id: post.id,
            title: post.title,
            createdAt: post.createdAt
        };
    }

    // unset trending post
    async unsetTrendingPost(postId: number):Promise<AdminPostTrendingInterface> {
        // get post
        const post = await this.postRepository.findOneByOrFail({ id: postId });
        // unset trending
        post.is_highlight = false;
        await this.postRepository.save(post);   

        return {
            id: post.id,
            title: post.title,
            createdAt: post.createdAt
        };
    }
}
