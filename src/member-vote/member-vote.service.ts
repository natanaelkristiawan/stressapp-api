import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { In, Repository } from 'typeorm';
import { VoteMemberEntity } from 'src/entity/vote-member.entity';
import { PostEntity } from 'src/entity/post.entity';
import { VoteEntity } from 'src/entity/vote.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { MemberVote, VoteDetailResponse, VoteOptionMembersResponse } from './interfaces/member-vote.interface';

@Injectable()
export class MemberVoteService {
  constructor(
    @InjectRepository(VoteMemberEntity, 'mimate')
    private readonly voteMemberRepository: Repository<VoteMemberEntity>,
    @InjectRepository(PostEntity, 'mimate')
    private readonly postRepository: Repository<PostEntity>,
    @InjectRepository(VoteEntity, 'mimate')
    private readonly voteRepository: Repository<VoteEntity>,
    @InjectRepository(UserMimateEntity, 'mimate')
    private readonly memberRepository: Repository<UserMimateEntity>,
    @InjectQueue('vote-totals-queue')
    private readonly voteTotalsQueue: Queue,
  ) {}

  private formatDateTime(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const sec = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${sec}`;
  }

  private formatDateOnly(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }


  private assertVoteWindow(post: PostEntity): void {
    const now = new Date();
    if (post.vote_start != null && now < new Date(post.vote_start)) {
      throw new BadRequestException(`You can vote when the poll is open. This poll has not started yet.`);
    }
    if (post.vote_end != null && now > new Date(post.vote_end)) {
      throw new BadRequestException(`You can vote when the poll is open. This poll has already ended.`);
    }
  }

  private getMemberName(name: string, mmid_fullname: string | undefined, id: number): string {
    let tempName = name;
    if (!tempName || tempName.trim() === '' || tempName == null) {
      tempName = mmid_fullname ?? '';
    }
    if (!tempName || tempName.trim() === '') {
      tempName = `user_${String(id).padStart(4, '0')}`;
    }
    return tempName
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private getAgeFromDob(dob: Date | string | undefined | null): string {
    if (!dob) return '';
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return String(age);
  }



  async createMemberVote(post_id: number, vote_id: number, member_id: number): Promise<MemberVote> {
    const post = await this.postRepository.findOne({
      where: { id: post_id },
      select: ['id', 'vote_start', 'vote_end'],
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    this.assertVoteWindow(post);

    const vote = await this.voteRepository.findOne({
      where: { id: vote_id, postId: post_id },
    });
    if (!vote) {
      throw new NotFoundException('Vote option not found or does not belong to this post');
    }

    const member = await this.memberRepository.findOne({ where: { id: member_id } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    let voteMember = await this.voteMemberRepository.findOne({
      where: { postId: post_id, memberId: member_id },
      relations: ['member'],
    });
    

    if (voteMember) {
      // voteMember.voteId = vote_id;
      // voteMember.vote = vote;
      // voteMember = await this.voteMemberRepository.save(voteMember);
      throw new NotFoundException('You are already give vote for this post');
    } else {
      voteMember = await this.voteMemberRepository.save({
        postId: post_id,
        voteId: vote_id,
        memberId: member_id,
        post,
        vote,
        member,
      });
    }

    const withMember = await this.voteMemberRepository.findOne({
      where: { id: voteMember.id },
      relations: ['member'],
    });

    await this.voteTotalsQueue.add('recalculate-vote-totals', { post_id }, { removeOnComplete: true });

    return this.toMemberVoteResponse(withMember ?? voteMember);
  }

  async updateMemberVote(post_id: number, vote_id: number, member_id: number): Promise<MemberVote> {
    throw new NotFoundException('You are already give vote for this post');
    const post = await this.postRepository.findOne({
      where: { id: post_id },
      select: ['id', 'vote_start', 'vote_end'],
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    this.assertVoteWindow(post);

    const vote = await this.voteRepository.findOne({
      where: { id: vote_id, postId: post_id },
    });
    if (!vote) {
      throw new NotFoundException('Vote option not found or does not belong to this post');
    }

    const member = await this.memberRepository.findOne({ where: { id: member_id } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const existing = await this.voteMemberRepository.findOne({
      where: { postId: post_id, memberId: member_id },
      relations: ['member'],
    });
    if (!existing) {
      throw new NotFoundException('No existing vote found for this post to update');
    }

    await this.voteMemberRepository.softRemove(existing);

    const voteMember = await this.voteMemberRepository.save({
      postId: post_id,
      voteId: vote_id,
      memberId: member_id,
      post,
      vote,
      member,
    });

    const withMember = await this.voteMemberRepository.findOne({
      where: { id: voteMember.id },
      relations: ['member'],
    });

    await this.voteTotalsQueue.add('recalculate-vote-totals', { post_id }, { removeOnComplete: true });

    return this.toMemberVoteResponse(withMember ?? voteMember);
  }

  async getVoteDetailByPostId(post_id: number, memberId?: number): Promise<VoteDetailResponse> {
    const post = await this.postRepository.findOne({
      where: { id: post_id },
      select: ['id', 'total_vote', 'vote_start', 'vote_end'],
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const voteOptions = await this.voteRepository.find({
      where: { postId: post_id },
      order: { order: 'ASC' },
    });

    const totalVotes = post.total_vote ?? 0;
    const votes = voteOptions.map((v) => {
      const count = v.total_vote ?? 0;
      const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100 * 100) / 100 : 0;
      return {
        id: v.id!,
        vote: v.vote ?? '',
        total_vote: count,
        percentage,
      };
    });

    let my_vote_id: number =0;
    if (memberId != null) {
      const myVote = await this.voteMemberRepository.findOne({
        where: { postId: post_id, memberId },
        select: ['voteId']
      });
      if (myVote?.voteId != null) {
        my_vote_id = myVote.voteId;
      }
    }

    return {
      post_id,
      vote_start: post.vote_start ? this.formatDateTime(new Date(post.vote_start)) : null,
      vote_end: post.vote_end ? this.formatDateTime(new Date(post.vote_end)) : null,
      total_votes: totalVotes,
      votes,
      my_vote_id,
    };
  }

  /**
   * Builds vote report CSV with columns: Username, umur, domisili, gender, kendaraan, hobi, hasil vote, jumlah vote.
   * Uses local members profiles; external vehicle details are unavailable.
   */
  async getVoteReportCsv(post_id: number): Promise<{ csv: string; filename: string }> {
    const detail = await this.getVoteDetailByPostId(post_id, undefined);
    const rows: string[] = [];

    const escape = (val: string | number): string => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const voteIdToLabel = new Map(detail.votes.map((v) => [v.id, v.vote]));
    const voteMembers = await this.voteMemberRepository.find({
      where: { postId: post_id },
      relations: ['member'],
      order: { created_at: 'DESC' },
    });

    // Keep the legacy report shape without querying retired external vehicle tables.
    const vehicleMap = new Map<number, string>();

    const header = ['Username', 'umur', 'domisili', 'gender', 'kendaraan', 'hobi', 'hasil vote', 'jumlah vote'];
    rows.push(header.map(escape).join(','));

    for (const vm of voteMembers) {
      const member = vm.member;
      const username = this.getMemberName(
        member?.name ?? '',
        member?.mmid_fullname,
        member?.id ?? 0,
      );
      const umur = this.getAgeFromDob(member?.dob);
      const domisili = [member?.address, member?.post_code].filter(Boolean).join(' ') || '';
      const gender = member?.gender ?? '';
      const kendaraan = (member?.userId != null ? vehicleMap.get(member.userId) : '') ?? '';
      const hobi = member?.hobby ?? '';
      const hasilVote = voteIdToLabel.get(vm.voteId ?? 0) ?? '';
      const jumlahVote = String(detail.total_votes);

      rows.push(
        [username, umur, domisili, gender, kendaraan, hobi, hasilVote, jumlahVote].map(escape).join(','),
      );
    }

    const csv = '\uFEFF' + rows.join('\r\n');
    const filename = `vote-report-post-${post_id}.csv`;
    return { csv, filename };
  }

  async getMembersByVoteId(vote_id: number): Promise<VoteOptionMembersResponse> {
    const voteOption = await this.voteRepository.findOne({
      where: { id: vote_id },
    });
    if (!voteOption) {
      throw new NotFoundException('Vote option not found');
    }

    const voteMembers = await this.voteMemberRepository.find({
      where: { voteId: vote_id },
      relations: ['member'],
      order: { created_at: 'DESC' },
    });

    const members = voteMembers.map((vm) => ({
      id: vm.member?.id ?? 0,
      name: this.getMemberName(
        vm.member?.name ?? '',
        vm.member?.mmid_fullname,
        vm.member?.id ?? 0,
      ),
      profilePictureUrl: vm.member?.profilePictureUrl ?? undefined,
      votedAt: vm.created_at ? this.formatDateOnly(new Date(vm.created_at)) : undefined,
    }));

    return {
      vote_id,
      vote: voteOption.vote ?? '',
      total_vote: voteOption.total_vote ?? 0,
      members,
    };
  }

  async deleteMemberVote(post_id: number, member_id: number): Promise<void> {
    const post = await this.postRepository.findOne({
      where: { id: post_id },
      select: ['id', 'vote_start', 'vote_end'],
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    this.assertVoteWindow(post);

    const existing = await this.voteMemberRepository.findOne({
      where: { postId: post_id, memberId: member_id },
    });
    if (!existing) {
      throw new NotFoundException('No vote found for this post to delete');
    }
    await this.voteMemberRepository.softRemove(existing);
    await this.voteTotalsQueue.add('recalculate-vote-totals', { post_id }, { removeOnComplete: true });
  }

  private toMemberVoteResponse(entity: VoteMemberEntity): MemberVote {
    const m = entity.member;
    return {
      id: entity.id!,
      post_id: entity.postId!,
      vote_id: entity.voteId!,
      member: {
        id: m?.id ?? 0,
        name: m?.name ?? '',
        profilePictureUrl: m?.profilePictureUrl ?? undefined,
      },
    };
  }
}
