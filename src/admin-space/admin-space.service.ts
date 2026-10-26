import { createHash } from 'crypto';
import { PostEntity } from 'src/entity/post.entity';
import { MemberSpaceEntity } from 'src/entity/member-spaces.entity';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
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

        // Exclude the internal hidden root container (backup_space_id = 0)
        query.where('(space.backup_space_id != 0 OR space.backup_space_id IS NULL)');
        
        // search
        if (search) {
            query.andWhere('(space.name LIKE :search OR space.description LIKE :search)', { search: `%${search}%` });
        }

        // sort
        if (sort) {
            query.orderBy(`space.${sort}`, order === 'asc' ? 'ASC' : 'DESC');
        } else {
            query.orderBy('space.id', 'DESC');
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
            version: this.version(item),
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
    async createSpace(dto: AdminSpaceCreateDto): Promise<DataSpace> {
        const { name, description, image, banner, is_dealer } = dto;

        const home = await this.spaceRepository.findOne({ where: { backup_space_id: 0 } });
        if (!home) {
            throw new ConflictException('Community root is missing. Configure it before creating communities.');
        }
        const parentSpaceId = home.id;

        const space = this.spaceRepository.create({
            name,
            description: description ?? '',
            image: image ?? '',
            banner: banner ?? '',
            hidden: 0,
            inviteOnly: 0,
            membersCount: 0,
            postsCount: 0,
            backup_space_id: parentSpaceId,
            created_at: new Date(),
            is_dealer: Boolean(is_dealer),
        });

        // save
        const data = await this.spaceRepository.save(space);

        return this.view(data);
    }

    /** Hashes editable fields only; member/post counters do not invalidate an editor. */
    private version(space: SpaceEntity): string {
        return createHash('sha256').update(JSON.stringify([
            space.id, space.name, space.description, space.image, space.banner,
            space.is_dealer, space.backup_space_id, space.hidden, space.inviteOnly,
        ])).digest('hex');
    }

    /** Maps the same complete response for create, list and edit. */
    private view(space: SpaceEntity): AdminSpaceViewDto {
        return {
            id: space.id, version: this.version(space), name: space.name,
            description: space.description, image: space.image, banner: space.banner,
            membersCount: space.membersCount, postsCount: space.postsCount,
            backup_space_id: space.backup_space_id, is_dealer: space.is_dealer,
            created_at: space.created_at,
        };
    }

    /** Internal root records cannot be read or mutated as communities. */
    private requireCommunity(space: SpaceEntity | null): SpaceEntity {
        if (!space || space.backup_space_id === 0) {
            throw new NotFoundException('Community not found');
        }
        return space;
    }

    /** Loads a community directly by ID, excluding the root. */
    async viewSpace(id: number): Promise<AdminSpaceViewDto> {
        return this.view(this.requireCommunity(await this.spaceRepository.findOne({ where: { id } })));
    }

    /** Locks and compares the editor snapshot before changing a community. */
    private async editable(manager: EntityManager, id: number, version: string): Promise<SpaceEntity> {
        const space = this.requireCommunity(await manager.findOne(SpaceEntity, {
            where: { id }, lock: { mode: 'pessimistic_write' },
        }));
        if (this.version(space) !== version) {
            throw new ConflictException('Community changed. Reload before saving.');
        }
        return space;
    }

    /** Updates only editable fields under the same lock as the version check. */
    async updateSpace(dto: AdminSpaceUpdateDto): Promise<AdminSpaceViewDto> {
        return this.spaceRepository.manager.transaction(async (manager) => {
            const space = await this.editable(manager, dto.id, dto.version);
            if (dto.name !== undefined) { space.name = dto.name; }
            if (dto.description !== undefined) { space.description = dto.description; }
            if (dto.image !== undefined) { space.image = dto.image; }
            if (dto.banner !== undefined) { space.banner = dto.banner; }
            if (dto.is_dealer !== undefined) { space.is_dealer = dto.is_dealer; }
            await manager.save(SpaceEntity, space);
            return this.view(space);
        });
    }

    /** Refuses destructive deletion of communities with any retained references. */
    async deleteSpace(dto: AdminSpaceDeleteDto): Promise<{ deleted: boolean }> {
        try {
            return await this.spaceRepository.manager.transaction(async (manager) => {
                const space = await this.editable(manager, dto.id, dto.version);
                const posts = await manager.count(PostEntity, { where: { space: { id: dto.id } }, withDeleted: true });
                const memberships = await manager.count(MemberSpaceEntity, { where: { backup_space_id: dto.id } });
                const children = await manager.count(SpaceEntity, { where: { backup_space_id: dto.id } });
                if (posts || memberships || children) {
                    throw new ConflictException('Community has posts, members or child communities and cannot be deleted.');
                }
                await manager.remove(SpaceEntity, space);
                return { deleted: true };
            });
        } catch (error) {
            if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_ROW_IS_REFERENCED_2') {
                throw new ConflictException('Community is still referenced and cannot be deleted.');
            }
            throw error;
        }
    }
}
