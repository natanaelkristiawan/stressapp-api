import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserMimateEntity, 'mimate')
    private userMimateRepository: Repository<UserMimateEntity>,
  ) {}

  /** Resolves a local legacy/CMS profile without external identity synchronization.
   * @returns The non-deleted profile, or null for an invalid/missing local ID.
   */
  async getLocalMember(id: number): Promise<UserMimateEntity | null> {
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    return this.userMimateRepository.findOne({
      where: { id },
      withDeleted: false,
    });
  }

  // update last activity user
  async updateLastActivity(id: number) {
    let user = await this.userMimateRepository.findOne({
      where: { id: id },
      withDeleted: false,
    });

    if (!user) {
      return null;
    }

    // check if deleted_at is not null
    if (user.deleted_at) {
      return null;
    }

    user.last_seen_at = new Date();
    return await this.userMimateRepository.save(user);
  }

  // set active user
  async setActiveUser(id: number) {
    let user = await this.userMimateRepository.findOne({
      where: { id: id },
      withDeleted: false,
    });

    if (!user) {
      return null;
    }

    if (user.activated_at == null) {
      user.activated_at = new Date();
      return await this.userMimateRepository.save(user);
    }

    return null;
  }
}
