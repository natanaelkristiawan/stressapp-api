import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostTagsEntity } from '../entity/post-tags.entity';
import { ILike, Repository } from 'typeorm';
import { TagsDto } from './dtos/tags.dto';
import { TagsInterface } from './interfaces/tags.interface';

@Injectable()
export class TagService {
  constructor(
    @InjectRepository(PostTagsEntity, 'mimate')
    private postTagsRepository: Repository<PostTagsEntity>,
  ) {}

  async getTags(tagsDto: TagsDto): Promise<TagsInterface[]> {
    const { limit, title } = tagsDto;

    // create with query builder
    const query = this.postTagsRepository.createQueryBuilder('post_tags');
    if(title) {
        query.where('post_tags.title LIKE :title', { title: `%${title}%` });
    }
    query.take(limit);

    const tags:TagsInterface[] = [];

    for(const tag of await  query.getMany()) {
        tags.push({
            title: tag.title
        });
    }

    return tags;
  }


}   
