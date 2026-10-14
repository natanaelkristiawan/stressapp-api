import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpaceEntity } from 'src/entity/space.entity';
import { AdminSpaceListDto , AdminSpaceCreateDto, AdminSpaceViewDto, AdminSpaceUpdateDto, AdminSpaceDeleteDto } from './dtos/admin-space.dto';
import { Datatable, DataSpace } from './interfaces/datatable.interface';
import { AdminPostListDto } from 'src/admin-post/dtos/admin-post.dto';
import { AdminPostService } from 'src/admin-post/admin-post.service';
// datatables
import { Datatable as DatatablePost } from 'src/admin-post/interfaces/datatable.interface';

@Injectable()
export class AdminSpaceService {

    constructor(
        @InjectRepository(SpaceEntity, 'mimate')
        private spaceRepository: Repository<SpaceEntity>,
        private adminPostService: AdminPostService
    ) {}

    // get all space
    async getAllSpace(dto: AdminSpaceListDto): Promise<Datatable> {
        const { page, limit, search, sort, order } = dto;

        const query = this.spaceRepository.createQueryBuilder('space');

        // statik
        query.where('backup_space_id = :backup_space', {backup_space: 15});
        
        // search
        if (search) {
            query.andWhere('space.name LIKE :search OR space.description LIKE :search', { search: `%${search}%` });
        }

        // sort
        if (sort) {
            query.orderBy(`space.${sort}`, order === 'asc' ? 'ASC' : 'DESC');
        }    

        // pagination
        query.skip((page - 1) * limit).take(limit);

        // get total
        const total = await query.getCount();
        
        // get data
        const data = await query.getMany();

        // collect data
        const items = data.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            membersCount: item.membersCount,
            postsCount: item.postsCount,
            created_at: item.created_at,
            image:item.image,
            banner:item.banner
        }));

        return {
            items: items,
            recordsTotal: total,
            recordsFiltered: total,
        }
    }
    

    // get post by space id
    async getPostBySpaceId(dto: AdminPostListDto, spaceId: number): Promise<DatatablePost> {
        return this.adminPostService.getPost(dto, spaceId);
    }


    // get post highlight by space id
    async getPostHighlightBySpaceId(spaceId?: number): Promise<DatatablePost> {
        const dto = {
            page: 1,
            limit: 100, 
            search:"",
            start_date: undefined,
            end_date:undefined
        }

        return this.adminPostService.getPost(dto, spaceId, true);
    }

    // create space
    async createSpace(dto: AdminSpaceCreateDto):Promise<DataSpace> {
        const { name, image, banner, is_dealer } = dto

        let space = this.spaceRepository.create({
            name: name,
            image: image,
            banner: banner,
            membersCount: 0,
            postsCount: 0,
            backup_space_id: 15,
            created_at: new Date(),
            is_dealer: is_dealer
        })

        // save
        let data = await this.spaceRepository.save(space)

        // set as response

        return {
            id: data.id,
            name:data.name,
            image: data.image,
            banner: data.banner,
            membersCount: data.membersCount,
            postsCount: data.postsCount,
            created_at: data.created_at,
        }

    }

    // view space by id
    async viewSpace(id: number): Promise<AdminSpaceViewDto> {
        const space = await this.spaceRepository.findOne({ where: { id } });
        if (!space) throw new Error('Space not found');
        return {
            id: space.id,
            name: space.name,
            description: space.description,
            image: space.image,
            banner: space.banner,
            membersCount: space.membersCount,
            postsCount: space.postsCount,
            backup_space_id: space.backup_space_id,
            is_dealer: space.is_dealer,
            created_at: space.created_at,
        };
    }

    // update space
    async updateSpace(dto: AdminSpaceUpdateDto): Promise<AdminSpaceViewDto> {
        const space = await this.spaceRepository.findOne({ where: { id: dto.id } });
        if (!space) throw new Error('Space not found');
        if (dto.name !== undefined) space.name = dto.name;
        if (dto.description !== undefined) space.description = dto.description;
        if (dto.image !== undefined) space.image = dto.image;
        if (dto.banner !== undefined) space.banner = dto.banner;
        if (dto.is_dealer !== undefined) space.is_dealer = dto.is_dealer;
        await this.spaceRepository.save(space);
        return {
            id: space.id,
            name: space.name,
            description: space.description,
            image: space.image,
            banner: space.banner,
            membersCount: space.membersCount,
            postsCount: space.postsCount,
            backup_space_id: space.backup_space_id,
            is_dealer: space.is_dealer,
            created_at: space.created_at,
        };
    }

    // delete space
    async deleteSpace(dto: AdminSpaceDeleteDto): Promise<{ deleted: boolean }> {
        const result = await this.spaceRepository.delete(dto.id);
        return { deleted: result.affected > 0 };
    }

}
