import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Activity } from '../entity/activity.entity';
import { ConversationCard } from '../entity/conversation-card.entity';
import { InterestCategory } from '../entity/interest-category.entity';
import {
  ConversationCardInputDto,
  ConversationCardListDto,
  UpdateConversationCardDto,
} from './conversation-cards.dto';

/** Treats legacy/ad-hoc `0` values as uncategorized instead of a real FK. */
function linkedCategoryId(row: ConversationCard): number | null {
  return row.categoryId && row.categoryId > 0 ? row.categoryId : null;
}

/** Returns the card contract without internal uniqueness metadata. */
export function conversationCardView(row: ConversationCard) {
  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    subPrompt: row.subPrompt,
    color: row.color,
    textColor: row.textColor,
    visual: row.visual,
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
export class ConversationCardsService {
  constructor(@InjectDataSource('mimate') private readonly db: DataSource) {}

  /** Applies literal search and stable, bounded database pagination. */
  async list(query: ConversationCardListDto) {
    const builder = this.db
      .getRepository(ConversationCard)
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.category', 'category');
    if (query.search) {
      builder.andWhere('LOCATE(:search, LOWER(card.title)) > 0', {
        search: query.search.toLowerCase(),
      });
    }
    if (query.categoryId) {
      builder.andWhere('card.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.status !== 'all') {
      builder.andWhere('card.isActive = :active', {
        active: query.status === 'active',
      });
    }
    const columns = {
      title: 'card.title',
      category: 'category.sortOrder',
      sortOrder: 'card.sortOrder',
      createdAt: 'card.createdAt',
    };
    const [rows, total] = await builder
      .orderBy(
        columns[query.sortBy],
        query.sortOrder === 'desc' ? 'DESC' : 'ASC',
      )
      .addOrderBy('card.sortOrder', 'ASC')
      .addOrderBy('card.id', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return {
      items: rows.map(conversationCardView),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Returns active cards in display order for member topic selection. */
  async listActive() {
    const rows = await this.db
      .getRepository(ConversationCard)
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.category', 'category')
      .where('card.isActive = :active', { active: true })
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('card.sortOrder', 'ASC')
      .addOrderBy('card.id', 'ASC')
      .getMany();
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      prompt: row.prompt,
      subPrompt: row.subPrompt,
      color: row.color,
      textColor: row.textColor,
      visual: row.visual,
      categoryId: linkedCategoryId(row),
      category: row.category
        ? { id: row.category.id, name: row.category.name }
        : null,
      sortOrder: row.sortOrder,
    }));
  }

  /** Loads active or inactive records for direct CMS links. */
  async detail(id: number) {
    const row = await this.db.getRepository(ConversationCard).findOne({
      where: { id },
      relations: { category: true },
    });
    if (!row) {
      throw new NotFoundException('Conversation card not found.');
    }
    return conversationCardView(row);
  }

  /** Locks and compares the reviewed revision before a mutation. */
  private async editable(manager: EntityManager, id: number, revision: number) {
    const row = await manager.findOne(ConversationCard, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!row) {
      throw new NotFoundException('Conversation card not found.');
    }
    if (row.revision !== revision) {
      throw new ConflictException(
        'Conversation card changed. Reload before saving.',
      );
    }
    return row;
  }

  /** Writes minimal admin metadata in the same transaction as the catalog mutation. */
  private async audit(
    manager: EntityManager,
    row: ConversationCard,
    actorId: number,
    action: string,
  ) {
    await manager.save(Activity, {
      source: 'cms-chat-cards',
      action,
      userId: actorId,
      message: JSON.stringify({ cardId: row.id, revision: row.revision }),
    });
  }

  /** Creates or updates a card, validating its optional category reference. */
  async save(
    input: ConversationCardInputDto | UpdateConversationCardDto,
    actorId: number,
    id?: number,
  ) {
    return this.db.transaction(async (manager) => {
      let row: ConversationCard;
      if (id === undefined) {
        row = manager.create(ConversationCard, { revision: 0 });
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

      row.title = input.title;
      row.prompt = input.prompt;
      row.subPrompt = input.subPrompt;
      row.color = input.color;
      row.textColor = input.textColor;
      row.visual = input.visual;
      row.categoryId = category ? category.id : null;
      row.category = category;
      row.sortOrder = input.sortOrder;
      row.isActive = input.isActive;
      row.revision += 1;
      const saved = await manager.save(ConversationCard, row);
      saved.category = category;
      await this.audit(
        manager,
        saved,
        actorId,
        id === undefined ? 'chat-card-create' : 'chat-card-update',
      );
      return conversationCardView(saved);
    });
  }

  /** Hides a card from selection while retaining its row and category link. */
  async deactivate(id: number, revision: number, actorId: number) {
    return this.db.transaction(async (manager) => {
      const row = await this.editable(manager, id, revision);
      if (!row.isActive) {
        return conversationCardView(row);
      }
      row.isActive = false;
      row.revision += 1;
      const saved = await manager.save(ConversationCard, row);
      await this.audit(manager, saved, actorId, 'chat-card-deactivate');
      return conversationCardView(saved);
    });
  }
}
