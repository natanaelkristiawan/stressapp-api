import { Injectable } from '@nestjs/common';
import { UserEntity } from '../entity/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { SpaceService } from 'src/space/space.service';
import { MemberSpaceEntity } from 'src/entity/member-spaces.entity';

@Injectable()
export class AuthService {

    constructor(
        @InjectRepository(UserEntity, 'mmid')
        private userMMIDRepository: Repository<UserEntity>, 

        @InjectRepository(UserMimateEntity, 'mimate')
        private userMimateRepository: Repository<UserMimateEntity>,

        @InjectRepository(MemberSpaceEntity, 'mimate')
        private memberSpaceRepository: Repository<MemberSpaceEntity>,

        private spaceService: SpaceService

    ){}

    private generateRandomString(length = 10): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // check existing
        const exist = this.userMimateRepository.findOneBy({memberId: result})

        if(exist) {
            return this.generateRandomString(10);
        }

        return result;
    }


    // check user mimate exist
    async checkUserMimateExist(id: number): Promise<boolean> {
        const user = await this.userMimateRepository.findOneBy({userId: id})
        return user != null
    }   


    // get user mmid
    async getUserMMID(id: number):Promise<UserMimateEntity> {

        let user = await this.userMMIDRepository.findOneBy({id: id})

        let is_dealer = false
   
        if(user) {
            let dataMember = new UserMimateEntity()
            let createdAt = new Date()
            // find by user id and skip deleted_at
            let mimateUser = await this.userMimateRepository.findOne({where: {userId:user.id}, withDeleted: false});



            let is_suspended = false;
            let member_verified = false;
            if(mimateUser) {

                

                // check if deleted_at is not null
                if(mimateUser.deleted_at) {
                    return null
                }

                dataMember.id = mimateUser.id
                createdAt = mimateUser.created_at
                is_suspended = mimateUser.is_suspended;
                member_verified = mimateUser.member_verified;
                if(mimateUser.is_dealer) {
                    is_dealer = true
                }
            } else {
                
                // check if user.email not null or empty
                if(user.email !== null && user.email !== '') {
                    mimateUser = await this.userMimateRepository.findOneBy({email: user.email})
                
                    if(mimateUser) {
                        dataMember.id = mimateUser.id
                        createdAt = mimateUser.created_at
                        is_suspended = mimateUser.is_suspended;
                        member_verified = mimateUser.member_verified;
                        if(mimateUser.is_dealer) {
                            is_dealer = true
                        }
                    }

                }
                
                // make sure find from email
               
            }
            let profile = user.mimate_image_profile
            // if not empty user photo
            if(user.user_photo != '' && user.user_photo != null) {

                // check if url format is https
                if(user.user_photo.startsWith('https')) {
                    profile = user.user_photo
                } else {
                    profile = `${process.env.KTB_SERVER}/${user.user_photo}`
                }
            }
            
            // dataMember.id = mimateUser.id
            dataMember.name = user.mimate_fullname
            dataMember.email = user.email
            dataMember.profilePictureUrl = profile
            dataMember.email_mmid = user.email
            dataMember.post_code = user.post_code
            dataMember.address = user.address
            dataMember.dob = new Date(user.birthdate)
            dataMember.gender = user.gender
            dataMember.sim_expired = new Date(user.sim_expiry_date)
            dataMember.created_at = createdAt
            dataMember.updated_at = new Date()
            dataMember.externalId = id.toString()
            dataMember.userId = id
            dataMember.last_seen_at = new Date()
            dataMember.tagline= user?.mimate_tagline || '';
            dataMember.bio= user?.mimate_bio || '';
            dataMember.hobby= user?.mimate_hobby || '';
            dataMember.link= user?.mimate_link || '';
            dataMember.mmid_fullname = user?.fullname || '';   
            dataMember.is_suspended = is_suspended;
            dataMember.member_verified = member_verified;
            try {

                // save or update
                let member = await this.userMimateRepository.save(dataMember)
                // await this.spaceService.follow(7, member.id) 

              

                if(is_dealer) {
                    await this.spaceService.follow(5, member.id)
                }

                return member
            } catch (error) {
            }



             
        }

        return null
    }

    // update last activity user
    async updateLastActivity(id: number) {
        let user = await this.userMimateRepository.findOne({where: {id: id}, withDeleted: false})   

        if(!user) {
            return null
        }

        // check if deleted_at is not null
        if(user.deleted_at) {
            return null
        }

        user.last_seen_at = new Date()
        return await this.userMimateRepository.save(user)
    }


    // set active user
    async setActiveUser(id:number) {
        let user = await this.userMimateRepository.findOne({where: {id: id}, withDeleted: false})   

        if(!user) {
            return null
        }

        if(user.activated_at == null) {
            user.activated_at = new Date()
            return await this.userMimateRepository.save(user)
        }
        
        return null

    }
    
}
