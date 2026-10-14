import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagsEntity } from 'src/entity/tags.entity';
import { AdminTagListDto, AdminTagExportDto } from './dtos/admin-tag.dto';
import { Datatable, DataTag } from './interfaces/datatable.interface';
import * as ExcelJS from 'exceljs';
import { writeFile } from 'fs/promises';
import { Datatable as DatatablePost } from 'src/admin-post/interfaces/datatable.interface';
import { AdminPostService } from 'src/admin-post/admin-post.service';
import { AdminPostListDto } from 'src/admin-post/dtos/admin-post.dto';
import { PostTagsEntity } from 'src/entity/post-tags.entity';

@Injectable()
export class AdminTagService {

    constructor(
        @InjectRepository(TagsEntity, 'mimate')
        private tagsRepository: Repository<TagsEntity>,

        @InjectRepository(PostTagsEntity, 'mimate')
        private postTagsRepository: Repository<PostTagsEntity>,

        private adminPostService: AdminPostService
    ) {}


    // get all user admin
    async getAllTag(dto: AdminTagListDto): Promise<Datatable> {
    
        // split dto
        const { page, limit, search } = dto;

        const query = this.tagsRepository.createQueryBuilder('tag');

        
        if (search) {
            query.where('tag.title LIKE :search OR tag.slug LIKE :search', { search: `%${search}%` });
        }

        // pagination
        query.skip((page - 1) * limit).take(limit);

        // get total
        const total = await query.getCount();

        

        // get data
        const data = await query.getMany();


        
        // collect data
        const items = await Promise.all(data.map(async (item) => {

            // get post count
            const postCount = await this.postTagsRepository.count({ where: { backup_tag_id  : item.id } });

            return {
                id: item.id,
                title: item.title,
                slug: item.slug,
                postCount: postCount,
            }
        }));

        return {
            items: items,
            recordsTotal: total,
            recordsFiltered: total,
        }
    }

    // get detail tag
    async getDetailTag(id: number): Promise<DataTag> {
        const tag = await this.tagsRepository.findOne({ where: { id } });
        return {
            id: tag.id,
            title: tag.title,
            slug: tag.slug,
            postCount: 0,
        }
    }

    // delete tag
    async deleteTag(id: number): Promise<void> {
        await this.tagsRepository.delete(id);
    }

    // export tag
    async exportTag(dto: AdminTagExportDto): Promise<{ buffer: Buffer; filename: string }> { 
        const {  search } = dto;

        const query = this.tagsRepository.createQueryBuilder('tag');

        if (search) {
            query.where('tag.title LIKE :search OR tag.slug LIKE :search', { search: `%${search}%` });
        }

        // get data
        const data = await query.getMany();

        // collect data
        const items = await Promise.all(data.map(async (item) => {

            // get post count
            const postCount = await this.postTagsRepository.count({ where: { backup_tag_id  : item.id } });

            return {
                id: item.id,
                title: item.title,
                slug: item.slug,
                postCount: postCount,
            }
        }));
        // write to excel
        const { buffer, filename } = await this.writeToExcel(items);

        return { buffer, filename };
    }

    // write to excel
    async writeToExcel(data: any): Promise<{ buffer: Buffer; filename: string }> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Tag List');
        
        // add header in interface DataTag
        worksheet.addRow(['Id', 'Title', 'Slug', 'Post Count']);

        for (const tag of data) {
            worksheet.addRow([tag.id, tag.title, tag.slug, tag.postCount]);
        }

        // generate buffer and filename for direct download
        const buffer = await workbook.xlsx.writeBuffer() as Buffer;
        const filename = `tag_list_${Date.now()}.xlsx`;
        return { buffer, filename };
    }       


    // get all post by tagID
    async getPostByTagId(dto: AdminPostListDto, tagId: number): Promise<DatatablePost> {
        return this.adminPostService.getPost(dto, null, false, tagId);
    }
    
}
