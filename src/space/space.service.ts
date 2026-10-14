import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MemberSpaceEntity } from 'src/entity/member-spaces.entity';
import { SpaceEntity } from 'src/entity/space.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { In, Not, Repository } from 'typeorm';
import { Space } from './interfaces/space.interface';

@Injectable()
export class SpaceService {
    private deeplink
    constructor(
        @InjectRepository(UserMimateEntity, 'mimate')
        private userMimateRepository: Repository<UserMimateEntity>,

        @InjectRepository(SpaceEntity, 'mimate')
        private spaceRepository: Repository<SpaceEntity>,

        @InjectRepository(MemberSpaceEntity, 'mimate')
        private memberSpaceRepository:Repository<MemberSpaceEntity>
    ){
        this.deeplink = process.env.DEEPLINK_URL
    }


    private formatToK(value: number): string {
        if (value < 1000) return value.toString();
      
        const formatted = value / 1000;
        const rounded = Math.round(formatted * 10) / 10; // one decimal place
      
        return `${rounded.toString().replace('.', ',')}K`;
      }


    async getHomeSpaces(memberId:number):Promise<Space[]> {

        let home = await this.spaceRepository.findOneBy({backup_space_id: 0})
        let spaces:Space[] = []

        if (home) {
            // find child
            let collections = await this.spaceRepository.find({where: {
                backup_space_id: home.id,
                inviteOnly: 0,
                hidden: 0
            },
                order: {
                    order: 'ASC'
                }
            })

            // find member spaces
            let memberSpaces = await this.memberSpaceRepository.find({where: {
                member: {
                    id: memberId
                }
            },
            relations: ["member", "space"]
            
        })

            for (let index = 0; index < collections.length; index++) {
                const item = collections[index];


                let following:boolean = false 
                let notification:boolean = false 
        
                for (let index = 0; index < memberSpaces.length; index++) {
                    const element = memberSpaces[index];
        
                    if(element.space.id == item.id) {
                        following = element.follow
                        
                        notification = element.notification
                    }
                    
                }

                
                let space:Space = {
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    image: item.image,
                    banner: item.banner,
                    inviteOnly: item.inviteOnly,
                    membersCount:  item.membersCount,
                    membersCountFormatted: this.formatToK(item.membersCount),
                    hidden: item.hidden,
                    postsCount: item.postsCount,
                    postsCountFormatted: this.formatToK(item.postsCount),
                    backup_space_id: home.id,
                    following:following,
                    notification:notification,
                    is_dealer: item.is_dealer,
                    share_url: `${this.deeplink}/deeplink/mimate?page=space&id=${item.id}`
                }

                spaces.push(space)
            }
        }
        return spaces
    }

    async detailSpace(spaceId:number, memberId:number):Promise<Space> {
        
        let item = await this.spaceRepository.findOneBy({id:spaceId})

        if(!item ) {
            throw new NotFoundException();
        }
        

        // find member spaces
        let memberSpaces = await this.memberSpaceRepository.find({where: {
            member: {
                id: memberId
            }
        },
        relations: ["member", "space"]})
        
        let queryParent = await this.spaceRepository.findOneBy({id:item.backup_space_id})
        let parent:Space;

        if(queryParent) {
            parent  = {
                id: queryParent.id,
                name: queryParent.name,
                description: queryParent.description,
                image: queryParent.image,
                banner: queryParent.banner,
                inviteOnly: queryParent.inviteOnly,
                membersCount:  queryParent.membersCount,
                hidden: queryParent.hidden,
                postsCount: queryParent.postsCount,
                backup_space_id: queryParent.backup_space_id,
                is_dealer: queryParent.is_dealer,
                share_url: `${this.deeplink}/deeplink/mimate?page=space&id=${queryParent.id}`
            } 
        }

       
        let queryGroup = await this.spaceRepository.find({
            where: {
                backup_space_id: item.backup_space_id,
                inviteOnly: 0,
                hidden: 0
            }
        })

        let group:Space[] = []
        if (queryGroup) {
            for (let index = 0; index < queryGroup.length; index++) {
                const listGroup = queryGroup[index];
                let data = {
                    id: listGroup.id,
                    name: listGroup.name,
                    description: listGroup.description,
                    image: listGroup.image,
                    banner: listGroup.banner,
                    inviteOnly: listGroup.inviteOnly,
                    membersCount:  listGroup.membersCount,
                    hidden: listGroup.hidden,
                    postsCount: listGroup.postsCount,
                    backup_space_id: listGroup.backup_space_id,
                    is_dealer: listGroup.is_dealer,
                    share_url: `${this.deeplink}/deeplink/mimate?page=space&id=${listGroup.id}`
                } 

                group.push(data)
            }
        }

        let queryChild = await this.spaceRepository.find({
            where: {
                backup_space_id: item.id,
                inviteOnly: 0,
                hidden: 0
            }
        }) 


        let child:Space[] = []
        if (queryChild) {
            for (let index = 0; index < queryChild.length; index++) {
                const listGroup = queryChild[index];
                let data = {
                    id: listGroup.id,
                    name: listGroup.name,
                    description: listGroup.description,
                    image: listGroup.image,
                    banner: listGroup.banner,
                    inviteOnly: listGroup.inviteOnly,
                    membersCount:  listGroup.membersCount,
                    hidden: listGroup.hidden,
                    postsCount: listGroup.postsCount,
                    backup_space_id: listGroup.backup_space_id,
                    is_dealer: listGroup.is_dealer,
                    share_url: `${this.deeplink}/deeplink/mimate?page=space&id=${listGroup.id}`
                } 

                child.push(data)
            }
        }

        let following:boolean = false 
        let notification:boolean = false 

        for (let index = 0; index < memberSpaces.length; index++) {
            const element = memberSpaces[index];

            if(element.space.id == spaceId) {
                following = element.follow
                
                notification = element.notification
            }
            
        }


        let space:Space = {
            id: item.id,
            name: item.name,
            description: item.description,
            image: item.image,
            banner: item.banner,
            inviteOnly: item.inviteOnly,
            membersCount:  item.membersCount,
            hidden: item.hidden,
            postsCount: item.postsCount,
            backup_space_id: item.backup_space_id,
            parent:parent,
            group:group,
            child:child,
            following:following,
            notification: notification,
            is_dealer: item.is_dealer,
            share_url: `${this.deeplink}/deeplink/mimate?page=space&id=${item.id}`
        }

        return space
    }


    async isSpaceExist(spaceId:number):Promise<Boolean> {

        let item = await this.spaceRepository.findOneBy({id:spaceId})
        if(!item ) {
            throw new NotFoundException();
        }
        return true
    }



    async follow(spaceId:number, memberId:number):Promise<string> {
        
        let space = await this.spaceRepository.findOneBy({id:spaceId})
        if(!space ) {
            throw new NotFoundException();
        }

        let member = await this.userMimateRepository.findOneBy({id:memberId})
        if(!member) {
            throw new NotFoundException();
        }
        

        // check sudah follow
        let existing = await this.memberSpaceRepository.findOneBy({backup_member_id: memberId, backup_space_id: spaceId})

        if (existing) {
            if(existing.follow) {
                return 'Already follow space'
            }
        } else {
            existing = new MemberSpaceEntity()
        }

        existing.backup_member_id = memberId
        existing.backup_space_id = spaceId
        existing.follow = true
        existing.created_at = new Date()

        await this.memberSpaceRepository.save(existing)

        // get total member in space
        let totalMember = await this.memberSpaceRepository.count({where: {space:space, follow:true}})
        await this.spaceRepository.update({id:spaceId}, {membersCount:totalMember})

        

        return 'Success follow space'
    }


    async unfollow(spaceId:number, memberId:number):Promise<string> {
        
        let space = await this.spaceRepository.findOneBy({id:spaceId})
        if(!space ) {
            throw new NotFoundException();
        }

        if(space.id == 7) {
            throw new ForbiddenException('Cannot unfollow space warga mimate')
        }

        let member = await this.userMimateRepository.findOneBy({id:memberId})
        if(!member) {
            throw new NotFoundException();
        }

        // check sudah follow
        let existing = await this.memberSpaceRepository.findOneBy({member: member, space:space})

        if(existing) {
            if(existing.follow == false) {
                return 'Already unfollow space'
            }
        } else {
            throw new NotFoundException();
        }
        // check if space is dealer
      

        existing.member = member
        existing.space = space
        existing.follow = false
        if(!space.is_dealer) {
            existing.notification = false
        }
        existing.created_at = new Date()

        await this.memberSpaceRepository.save(existing)

        // get total member in space
        let totalMember = await this.memberSpaceRepository.count({where: {space:space, follow:true}})
        await this.spaceRepository.update({id:spaceId}, {membersCount:totalMember})

        return 'Success unfollow space'
    }

    async notification(spaceId:number, memberId:number, follow: boolean):Promise<string> {
        
        let space = await this.spaceRepository.findOneBy({id:spaceId})
        if(!space ) {
            throw new NotFoundException();
        }

        let member = await this.userMimateRepository.findOneBy({id:memberId})
        if(!member) {
            throw new NotFoundException();
        }
        

        // check sudah follow
        let existing = await this.memberSpaceRepository.findOneBy({member: member, space:space})

        if (!existing) {
            
            if(space.is_dealer) {
                // create new member space
                existing = new MemberSpaceEntity()
                existing.member = member
                existing.space = space
                existing.notification = follow
                existing.follow = false
                existing.created_at = new Date()

                // save data
                await this.memberSpaceRepository.save(existing)

                return 'Success update notification'

            } else {
                throw new ForbiddenException('Please follow space to get notification')
            }
        }


        if(!space.is_dealer && existing.follow == false) {
            throw new ForbiddenException('Please follow space to get notification')
        }

        // insert data
        let update:MemberSpaceEntity = {
            notification: follow,
        }

        await this.memberSpaceRepository.update({id:existing.id}, update)

        return 'Success update notification'
    }




    // space which member follow
    async spaceFollowed(memberId:number, spaceId?:number):Promise<Space[]> {
        let member = await this.userMimateRepository.findOneBy({id:memberId})
        if(!member) {
            throw new NotFoundException();
        }

        // paksa follow space warga mimate
        await this.follow(7, member.id) 

        // EXCLUDE HOME

        let spaces = await this.memberSpaceRepository.find({where: {member:member, follow:true, space: {id:Not(15), hidden:0}}, relations: ["space"]})


        let data:Space[] = []
        for (let index = 0; index < spaces.length; index++) {
            const element = spaces[index];
            
            let space:Space = {
                id: element.space.id,
                name: element.space.name,
                description: element.space.description,
                image: element.space.image,
                banner: element.space.banner,
                inviteOnly: element.space.inviteOnly,
                membersCount: element.space.membersCount,
                membersCountFormatted: this.formatToK(element.space.membersCount),
                hidden: element.space.hidden,
                postsCount: element.space.postsCount,
                backup_space_id: element.space.backup_space_id,
                is_dealer: element.space.is_dealer,
                share_url: `${this.deeplink}/deeplink/mimate?page=space&id=${element.space.id}`
            }

            data.push(space)
        }

        if(spaceId) {
            const moved = [
                data.find(item => item.id === spaceId),
                ...data.filter(item => item.id !== spaceId)
            ];
            return moved
        }

        return data

    }
    

}
