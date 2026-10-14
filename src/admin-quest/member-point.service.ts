import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserMimateEntity } from "src/entity/user-mimate.entity";
import { PointUserDto } from "./dtos/point-user.dto";
import { PointUserResponseInterface } from "./interfaces/point-user.interface";

@Injectable()
export class MemberPointService {
  constructor(
    @InjectRepository(UserMimateEntity, 'mimate')
    private readonly userMimateRepository: Repository<UserMimateEntity>,
  ) {}

  async getPointUser(dto: PointUserDto): Promise<PointUserResponseInterface> {
    const page = dto.page && dto.page > 0 ? Number(dto.page) : 1;
    const limit = dto.limit && dto.limit > 0 ? Number(dto.limit) : 10;
    const skip = (page - 1) * limit;

    const qb = this.userMimateRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.questPoint', 'questPoint');

    // Filter by Email
    if (dto.email && dto.email.trim() !== '') {
      qb.andWhere('(user.email LIKE :email OR user.email_mmid LIKE :email)', {
        email: `%${dto.email.trim()}%`,
      });
    }

    // Filter by Name
    if (dto.name && dto.name.trim() !== '') {
      qb.andWhere('(user.name LIKE :name OR user.mmid_fullname LIKE :name)', {
        name: `%${dto.name.trim()}%`,
      });
    }

    // Sorting
    const sortType = (dto.sortType || 'desc').toUpperCase() as 'ASC' | 'DESC';
    if (dto.sortField === 'totalPoints') {
      qb.orderBy('questPoint.totalPoints', sortType);
    } else if (dto.sortField === 'email') {
      qb.orderBy('user.email', sortType);
    } else if (dto.sortField === 'name') {
      qb.orderBy('user.name', sortType);
    } else {
      qb.orderBy('user.id', 'DESC');
    }

    qb.skip(skip).take(limit);

    const [users, total] = await qb.getManyAndCount();

    const items = users.map((user) => {
      const email = user.email || user.email_mmid || '-';
      const name = user.name || user.mmid_fullname || '-';
      const totalPoints =
        user.questPoint?.totalPoints != null
          ? Number(user.questPoint.totalPoints)
          : 0;

      return {
        id: user.id,
        email,
        name,
        totalPoints,
      };
    });

    return {
      items,
      recordsTotal: total,
      recordsFiltered: total,
    };
  }
}