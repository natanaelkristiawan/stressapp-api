import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserAdmin } from 'src/entity/user-admin.entity';
import { Repository } from 'typeorm';
import { Datatable, DataUser } from './interfaces/datatable.interface';
import { AdminStaffCreateDto, AdminStaffListDto, AdminStaffEditDto } from './dtos/admin-staff.dto';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminStaffService {

    // construct user-admin entity
    constructor(
        @InjectRepository(UserAdmin, 'mimate')
        private usersRepository: Repository<UserAdmin>,

        @InjectRepository(UserMimateEntity, 'mimate')
        private userMimateRepository: Repository<UserMimateEntity>,
    ) {}

    // get all user admin
    async getAllUserAdmin(dto: AdminStaffListDto): Promise<Datatable> {
       
        // split dto
        const { page, limit, search, sort, order, start_date, end_date } = dto;

        const query = this.usersRepository.createQueryBuilder('user');

        // sort
        if (sort) {
            query.orderBy(`user.${sort}`, order === 'asc' ? 'ASC' : 'DESC');
        }

        if (search) {
            query.where('user.name LIKE :search OR user.email LIKE :search', { search: `%${search}%` });
        }

        if (start_date && end_date) {   
            // add 00:00:00 in date_start
            const startDate = new Date(`${start_date}T00:00:00`);
            const endDate = new Date(`${end_date}T23:59:59`);

            query.andWhere('user.created_at BETWEEN :start_date AND :end_date', { start_date: startDate, end_date: endDate });
        }

        // pagination
        query.skip((page - 1) * limit).take(limit);

        // get total
        const total = await query.getCount();

        // join with userMimate
        query.leftJoinAndSelect('user.userMimate', 'userMimate');

        // get data
        const data = await query.getMany();




        // siterole 
        const siteRole = {
            0: 'User',
            1: 'Admin',
            2: 'Dealer'
        }


        // collect data
        const items = data.map((item) => {

            let siteRoleText = siteRole[item.userMimate.member_role];

            if(item.userMimate.is_dealer) {
                siteRoleText = 'Dealer';
            }

            return {
                id: item.id,
                memberId: item.userMimate.id,
                name: item.name,
                email: item.email,
                is_dealer: item.userMimate.is_dealer,
                siteRole: siteRoleText,
                createdAt: item.created_at,
                updatedAt: item.updated_at,
            }
        });

        return {
            items: items,
            recordsTotal: total,
            recordsFiltered: total,
        }
    }


    // create user admin
    async createUserAdmin(dto: AdminStaffCreateDto): Promise<{ message: string }> {
        let { memberId, role, password, confirmPassword, email:emailInput } = dto;

        // check if memberId is exist
        const member = await this.userMimateRepository.findOne({ where: { id: memberId } });

        if (!member) {
            throw new NotFoundException('Member not found');
        }

        let emailReal = member.email;

        if (emailInput) {
            emailReal = emailInput;
        }


        // validate password confirmation
        if (password !== confirmPassword) {
            throw new BadRequestException('Password and confirm password do not match');
        }

        // create user admin
        const userAdmin = this.usersRepository.create({
            email: emailReal,
            name: member.name,
            password: await bcrypt.hash(password, 10),
            userMimate: member,
            created_at: new Date(),
            updated_at: new Date(),
        });

        // save user admin
        await this.usersRepository.save(userAdmin);

        if (role === 0) {
            // update member role
            await this.userMimateRepository.update(memberId, { member_role: 0 });
        }

        // update member role
        if (role === 1) {
            await this.userMimateRepository.update(memberId, { member_role: 1 });
        }

        if (role === 2) {
            // update member role
            await this.userMimateRepository.update(memberId, { member_role: 1, is_dealer: true });
        }

        // return success
        return {
            message: 'User created successfully and password is ' + password,
        };
       
    }   

    // detail user admin
    async detailUserAdmin(id: number): Promise<DataUser> {
        // check if user admin is exist
        const userAdmin = await this.usersRepository.findOne({ where: { id }, relations: ['userMimate'] });

        if (!userAdmin) {
            throw new NotFoundException('User admin not found');
        }
           // siterole 
        const siteRole = {
            0: 'User',
            1: 'Admin'
        }

        
        // return data
        return {
            id: userAdmin.id,
            memberId: userAdmin.userMimate.id,
            name: userAdmin.name,
            email: userAdmin.email,
            is_dealer: userAdmin.userMimate.is_dealer,
            siteRole: siteRole[userAdmin.userMimate.member_role],
            createdAt: userAdmin.created_at,
            updatedAt: userAdmin.updated_at,
        };
    }

    // update user admin
    async editUserAdmin(dto: AdminStaffEditDto): Promise<{ message: string }> {
        const { id, memberId, password, confirmPassword, role, email:emailInput } = dto;

        // check if user admin exists
        const userAdmin = await this.usersRepository.findOne({ 
            where: { id }, 
            relations: ['userMimate'] 
        });

        if (!userAdmin) {
            throw new NotFoundException('User admin not found');
        }

        // check if memberId is exist
        const member = await this.userMimateRepository.findOne({ where: { id: memberId } });

        if (!member) {
            throw new NotFoundException('Member not found');
        }

        let emailReal = member.email;

        if (emailInput) {
            emailReal = emailInput;
        }

        // validate password confirmation if password is provided
        if (password && password !== confirmPassword) {
            throw new BadRequestException('Password and confirm password do not match');
        }

        // check if email already exists (if changing to a different member)
        if (memberId !== userAdmin.userMimate.id) {
            const existingEmail = await this.usersRepository.findOne({ 
                where: { email: member.email } 
            });
            if (existingEmail && existingEmail.id !== id) {
                throw new BadRequestException('Email already exists');
            }
        }

        // update user admin fields
        const updateData: any = {
            email: emailReal,
            name: member.name,
            updated_at: new Date(),
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        // update user admin
        await this.usersRepository.update(id, updateData);

        // update user mimate role if provided - same treatment as createUserAdmin
        if (role !== undefined) {
            if (role === 0) {
                // update member role to User
                await this.userMimateRepository.update(memberId, { 
                    member_role: 0,
                    is_dealer: false 
                });
            } else if (role === 1) {
                // update member role to Admin
                await this.userMimateRepository.update(memberId, { 
                    member_role: 1,
                    is_dealer: false 
                });
            } else if (role === 2) {
                // update member role to Dealer (Admin + is_dealer = true)
                await this.userMimateRepository.update(memberId, { 
                    member_role: 1,
                    is_dealer: true 
                });
            }
        }

        return {
            message: 'User admin updated successfully',
        };
    }

    // delete user admin
    async deleteUserAdmin(id: number): Promise<{ message: string }> {
        // check if user admin is exist
        const userAdmin = await this.usersRepository.findOne({ where: { id: id } });

        

        // reset user mimate
        const userMimate = await this.userMimateRepository.findOne({ where: { id: userAdmin.backup_member_id} });
        
        if (userMimate) {
            userMimate.is_dealer = false;
            userMimate.member_role = 0;
            await this.userMimateRepository.save(userMimate); 
        }

        if (!userAdmin) {
            throw new NotFoundException('User admin not found');
        }

        // delete user admin
        await this.usersRepository.delete(id);

        // return success
        return {
            message: 'User admin deleted successfully',
        };
    }
}
