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
  InterestCategoryInputDto,
  InterestCategoryListDto,
  normalizeInterestCategoryName,
  UpdateInterestCategoryDto,
} from './interest-categories.dto';

/** Returns the catalog contract without internal uniqueness metadata. */
export function interestCategoryView(row: InterestCategory) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class InterestCategoriesService {
  constructor(@InjectDataSource('mimate') private readonly db: DataSource) {}

  /** Applies literal search and stable, bounded database pagination. */
  async list(query: InterestCategoryListDto) {
    const builder = this.db
      .getRepository(InterestCategory)
      .createQueryBuilder('category');
    if (query.search) {
      builder.andWhere('LOCATE(:search, LOWER(category.name)) > 0', {
        search: query.search.toLowerCase(),
      });
    }
    if (query.status !== 'all') {
      builder.andWhere('category.isActive = :active', {
        active: query.status === 'active',
      });
    }
    const columns = {
      name: 'category.name',
      sortOrder: 'category.sortOrder',
      createdAt: 'category.createdAt',
    };
    const [rows, total] = await builder
      .orderBy(
        columns[query.sortBy],
        query.sortOrder === 'desc' ? 'DESC' : 'ASC',
      )
      .addOrderBy('category.id', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return {
      items: rows.map(interestCategoryView),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Returns active categories in display order for interest assignment. */
  async listActive() {
    const rows = await this.db.getRepository(InterestCategory).find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      sortOrder: row.sortOrder,
    }));
  }

  /** Loads active or inactive records for direct CMS links. */
  async detail(id: number) {
    const row = await this.db.getRepository(InterestCategory).findOneBy({ id });
    if (!row) {
      throw new NotFoundException('Interest category not found.');
    }
    return interestCategoryView(row);
  }

  /** Locks and compares the reviewed revision before a mutation. */
  private async editable(manager: EntityManager, id: number, revision: number) {
    const row = await manager.findOne(InterestCategory, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!row) {
      throw new NotFoundException('Interest category not found.');
    }
    if (row.revision !== revision) {
      throw new ConflictException(
        'Interest category changed. Reload before saving.',
      );
    }
    return row;
  }

  /** Writes minimal admin metadata in the same transaction as the catalog mutation. */
  private async audit(
    manager: EntityManager,
    row: InterestCategory,
    actorId: number,
    action: string,
  ) {
    await manager.save(Activity, {
      source: 'cms-interest-categories',
      action,
      userId: actorId,
      message: JSON.stringify({ categoryId: row.id, revision: row.revision }),
    });
  }

  /** Creates or updates a category; inactive names remain reserved for reactivation. */
  async save(
    input: InterestCategoryInputDto | UpdateInterestCategoryDto,
    actorId: number,
    id?: number,
  ) {
    try {
      return await this.db.transaction(async (manager) => {
        let row: InterestCategory;
        if (id === undefined) {
          row = manager.create(InterestCategory, { revision: 0 });
        } else {
          const revision = 'revision' in input ? input.revision : 0;
          row = await this.editable(manager, id, revision);
        }
        row.name = normalizeInterestCategoryName(input.name);
        row.nameKey = createHash('sha256')
          .update(row.name.toLowerCase())
          .digest('hex');
        row.description = input.description.trim();
        row.sortOrder = input.sortOrder;
        row.isActive = input.isActive;
        row.revision += 1;
        const saved = await manager.save(InterestCategory, row);
        await this.audit(
          manager,
          saved,
          actorId,
          id === undefined
            ? 'interest-category-create'
            : 'interest-category-update',
        );
        return interestCategoryView(saved);
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException(
          'A category with this name already exists. Edit or reactivate that record.',
        );
      }
      throw error;
    }
  }

  /** Hides a category from selection while retaining the row and its interest links. */
  async deactivate(id: number, revision: number, actorId: number) {
    return this.db.transaction(async (manager) => {
      const row = await this.editable(manager, id, revision);
      if (!row.isActive) {
        return interestCategoryView(row);
      }
      const activeInterests = await manager.count(Interest, {
        where: { categoryId: id, isActive: true },
      });
      if (activeInterests > 0) {
        throw new BadRequestException(
          'Move or deactivate the interests in this category first.',
        );
      }
      row.isActive = false;
      row.revision += 1;
      const saved = await manager.save(InterestCategory, row);
      await this.audit(manager, saved, actorId, 'interest-category-deactivate');
      return interestCategoryView(saved);
    });
  }
}
