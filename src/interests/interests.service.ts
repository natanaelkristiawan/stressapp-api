import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { Activity } from '../entity/activity.entity';
import { InterestCategory } from '../entity/interest-category.entity';
import { Interest } from '../entity/interest.entity';
import {
  InterestInputDto,
  InterestListDto,
  normalizeInterestName,
  UpdateInterestDto,
} from './interests.dto';

/** Treats legacy/ad-hoc `0` values as uncategorized instead of a real FK. */
function linkedCategoryId(row: Interest): number | null {
  return row.categoryId && row.categoryId > 0 ? row.categoryId : null;
}

/** Returns the catalog contract without internal uniqueness metadata. */
export function interestView(row: Interest) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categoryId: linkedCategoryId(row),
    category: row.category
      ? { id: row.category.id, name: row.category.name }
      : null,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class InterestsService {
  constructor(@InjectDataSource('mimate') private readonly db: DataSource) {}

  /** Applies literal search and stable, bounded database pagination. */
  async list(query: InterestListDto) {
    const builder = this.db
      .getRepository(Interest)
      .createQueryBuilder('interest')
      .leftJoinAndSelect('interest.category', 'category');
    if (query.search) {
      builder.andWhere('LOCATE(:search, LOWER(interest.name)) > 0', {
        search: query.search.toLowerCase(),
      });
    }
    if (query.categoryId) {
      builder.andWhere('interest.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.status !== 'all') {
      builder.andWhere('interest.isActive = :active', {
        active: query.status === 'active',
      });
    }
    const columns = {
      name: 'interest.name',
      category: 'category.sortOrder',
      sortOrder: 'interest.sortOrder',
      createdAt: 'interest.createdAt',
    };
    const [rows, total] = await builder
      .orderBy(
        columns[query.sortBy],
        query.sortOrder === 'desc' ? 'DESC' : 'ASC',
      )
      .addOrderBy('interest.sortOrder', 'ASC')
      .addOrderBy('interest.id', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return {
      items: rows.map(interestView),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Returns active catalog entries grouped by category for member selection. */
  async listActive() {
    const rows = await this.db
      .getRepository(Interest)
      .createQueryBuilder('interest')
      .leftJoinAndSelect('interest.category', 'category')
      .where('interest.isActive = :active', { active: true })
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('interest.sortOrder', 'ASC')
      .addOrderBy('interest.id', 'ASC')
      .getMany();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      categoryId: linkedCategoryId(row),
      category: row.category
        ? { id: row.category.id, name: row.category.name }
        : null,
      sortOrder: row.sortOrder,
    }));
  }

  /** Loads active or inactive records for direct CMS links. */
  async detail(id: number) {
    const row = await this.db.getRepository(Interest).findOne({
      where: { id },
      relations: { category: true },
    });
    if (!row) {
      throw new NotFoundException('Interest not found.');
    }
    return interestView(row);
  }

  /** Locks and compares the reviewed revision before a mutation. */
  private async editable(manager: EntityManager, id: number, revision: number) {
    const row = await manager.findOne(Interest, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!row) {
      throw new NotFoundException('Interest not found.');
    }
    if (row.revision !== revision) {
      throw new ConflictException('Interest changed. Reload before saving.');
    }
    return row;
  }

  /** Writes minimal admin metadata in the same transaction as the catalog mutation. */
  private async audit(
    manager: EntityManager,
    row: Interest,
    actorId: number,
    action: string,
  ) {
    await manager.save(Activity, {
      source: 'cms-interests',
      action,
      userId: actorId,
      message: JSON.stringify({ interestId: row.id, revision: row.revision }),
    });
  }

  /** Creates or updates a catalog item; inactive names remain reserved for reactivation. */
  async save(
    input: InterestInputDto | UpdateInterestDto,
    actorId: number,
    id?: number,
  ) {
    try {
      return await this.db.transaction(async (manager) => {
        let row: Interest;
        if (id === undefined) {
          row = manager.create(Interest, { revision: 0 });
        } else {
          const revision = 'revision' in input ? input.revision : 0;
          row = await this.editable(manager, id, revision);
        }
        const category =
          input.categoryId == null
            ? null
            : await manager.findOne(InterestCategory, {
                where: { id: input.categoryId },
              });
        if (input.categoryId != null && !category) {
          throw new BadRequestException('Selected category not found.');
        }
        row.name = normalizeInterestName(input.name);
        row.nameKey = createHash('sha256')
          .update(row.name.toLowerCase())
          .digest('hex');
        row.description = input.description.trim();
        row.categoryId = category ? category.id : null;
        row.category = category;
        row.sortOrder = input.sortOrder;
        row.isActive = input.isActive;
        row.revision += 1;
        const saved = await manager.save(Interest, row);
        saved.category = category;
        await this.audit(
          manager,
          saved,
          actorId,
          id === undefined ? 'interest-create' : 'interest-update',
        );
        return interestView(saved);
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException(
          'An interest with this name already exists. Edit or reactivate that record.',
        );
      }
      throw error;
    }
  }

  /** Removes an item from selection without destroying its identity or future relationships. */
  async deactivate(id: number, revision: number, actorId: number) {
    return this.db.transaction(async (manager) => {
      const row = await this.editable(manager, id, revision);
      if (!row.isActive) {
        return interestView(row);
      }
      row.isActive = false;
      row.revision += 1;
      const saved = await manager.save(Interest, row);
      await this.audit(manager, saved, actorId, 'interest-deactivate');
      return interestView(saved);
    });
  }
}
