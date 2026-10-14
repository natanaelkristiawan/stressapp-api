import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { VoteEntity } from 'src/entity/vote.entity';
import { PostEntity } from 'src/entity/post.entity';

@Injectable()
export class VoteService {
  constructor(
    @InjectRepository(VoteEntity, 'mimate')
    private voteRepository: Repository<VoteEntity>,
    @InjectRepository(PostEntity, 'mimate')
    private postRepository: Repository<PostEntity>,
  ) {}

  async createVotesForPost(postId: number, votes: { vote: string }[]): Promise<VoteEntity[]> {
    if (!votes?.length) return [];
    const post = await this.postRepository.findOneBy({ id: postId });
    if (!post) return [];
    const created: VoteEntity[] = [];
    for (let i = 0; i < votes.length; i++) {
      const v = await this.voteRepository.save({
        post,
        postId,
        vote: votes[i].vote,
        order: i + 1,
      });
      created.push(v);
    }
    return created;
  }

  async getVotesByPostId(postId: number): Promise<{ id: number; vote: string }[]> {
    const votes = await this.voteRepository.find({
      where: { postId },
      order: { order: 'ASC' },
    });
    return votes.map((v) => ({ id: v.id, vote: v.vote ?? '' }));
  }

  async updateVotesForPost(
    postId: number,
    votes: { id?: number; vote: string }[],
    voteDeleted?: number[],
  ): Promise<VoteEntity[]> {
    const post = await this.postRepository.findOneBy({ id: postId });
    if (!post) return [];

    if (voteDeleted?.length) {
      await this.voteRepository.softDelete({ postId, id: In(voteDeleted) });
    }

    const existing = await this.voteRepository.find({ where: { postId }, order: { order: 'ASC' } });
    const maxOrder = existing.length;
    const result: VoteEntity[] = [];
    let orderOffset = 0;

    for (let i = 0; i < votes.length; i++) {
      const item = votes[i];
      if (item.id != null) {
        const existingVote = await this.voteRepository.findOne({
          where: { id: item.id, postId },
        });
        if (existingVote) {
          existingVote.vote = item.vote;
          existingVote.order = i + 1;
          const updated = await this.voteRepository.save(existingVote);
          result.push(updated);
        }
      } else {
        const created = await this.voteRepository.save({
          post,
          postId,
          vote: item.vote,
          order: maxOrder + (orderOffset += 1),
        });
        result.push(created);
      }
    }
    return result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
}
