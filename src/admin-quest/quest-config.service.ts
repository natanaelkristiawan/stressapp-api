import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Quest } from "src/entity/quest.entity";
import {
  QuestListFilterDto,
  CreateQuestConfigDto,
  UpdateQuestConfigDto,
} from "./dtos/quest-config.dto";
import {
  QuestConfigItemInterface,
  QuestConfigListResponseInterface,
} from "./interfaces/quest-config.interface";

@Injectable()
export class QuestConfigService {
  constructor(
    @InjectRepository(Quest, "mimate")
    private readonly questRepo: Repository<Quest>,
  ) {}

  private mapQuestToItem(quest: Quest): QuestConfigItemInterface {
    return {
      id: quest.id,
      title: quest.title,
      description: quest.description || undefined,
      image: quest.image || undefined,
      point: quest.point != null ? Number(quest.point) : 0,
      condition: quest.condition || "single",
      action: quest.action || undefined,
      interval: quest.interval || "daily",
      dateStart: quest.dateStart || undefined,
      dateEnd: quest.dateEnd || undefined,
      status: Number(quest.status ?? 0),
      isMain: quest.isMain != null ? Number(quest.isMain) : 0,
      createdAt: quest.createdAt,
      updatedAt: quest.updatedAt,
    };
  }

  async getQuestList(
    dto: QuestListFilterDto,
  ): Promise<QuestConfigListResponseInterface> {
    const page = dto.page && dto.page > 0 ? Number(dto.page) : 1;
    const limit = dto.limit && dto.limit > 0 ? Number(dto.limit) : 10;
    const skip = (page - 1) * limit;

    const totalCount = await this.questRepo.count();

    const qb = this.questRepo.createQueryBuilder("quest");

    // Search filter (title, action, or description)
    if (dto.search && dto.search.trim() !== "") {
      const search = `%${dto.search.trim()}%`;
      qb.andWhere(
        "(quest.title LIKE :search OR quest.action LIKE :search OR quest.description LIKE :search)",
        { search },
      );
    }

    // Status filter
    if (dto.status !== undefined && dto.status !== null && dto.status !== ("" as any)) {
      qb.andWhere("quest.status = :status", { status: Number(dto.status) });
    }

    // Condition filter
    if (dto.condition && dto.condition.trim() !== "") {
      qb.andWhere("quest.condition = :condition", { condition: dto.condition.trim() });
    }

    // Interval filter
    if (dto.interval && dto.interval.trim() !== "") {
      qb.andWhere("quest.interval = :interval", { interval: dto.interval.trim() });
    }

    // Sorting
    const allowedSortFields: Record<string, string> = {
      id: "quest.id",
      title: "quest.title",
      point: "quest.point",
      condition: "quest.condition",
      action: "quest.action",
      interval: "quest.interval",
      status: "quest.status",
      createdAt: "quest.createdAt",
    };

    const sortField = dto.sortField && allowedSortFields[dto.sortField]
      ? allowedSortFields[dto.sortField]
      : "quest.id";
    const sortType = (dto.sortType || "desc").toUpperCase() as "ASC" | "DESC";

    qb.orderBy(sortField, sortType);

    qb.skip(skip).take(limit);

    const [quests, filteredCount] = await qb.getManyAndCount();

    return {
      items: quests.map((q) => this.mapQuestToItem(q)),
      recordsTotal: totalCount,
      recordsFiltered: filteredCount,
    };
  }

  async getQuestById(id: number): Promise<QuestConfigItemInterface> {
    const quest = await this.questRepo.findOne({
      where: { id },
    });

    if (!quest) {
      throw new NotFoundException(`Quest with ID ${id} not found`);
    }

    return this.mapQuestToItem(quest);
  }

  async createQuest(dto: CreateQuestConfigDto): Promise<QuestConfigItemInterface> {
    const newQuest = this.questRepo.create({
      title: dto.title,
      description: dto.description || null,
      image: dto.image || null,
      point: dto.point != null ? Number(dto.point) : 0,
      condition: dto.condition || "single",
      action: dto.action || null,
      interval: dto.interval || "daily",
      dateStart: dto.dateStart ? new Date(dto.dateStart) : null,
      dateEnd: dto.dateEnd ? new Date(dto.dateEnd) : null,
      status: dto.status != null ? Number(dto.status) : 1,
      isMain: dto.isMain != null ? Number(dto.isMain) : 0,
    });

    const saved = await this.questRepo.save(newQuest);
    return this.mapQuestToItem(saved);
  }

  async updateQuest(
    id: number,
    dto: UpdateQuestConfigDto,
  ): Promise<QuestConfigItemInterface> {
    const quest = await this.questRepo.findOne({
      where: { id },
    });

    if (!quest) {
      throw new NotFoundException(`Quest with ID ${id} not found`);
    }

    if (dto.title !== undefined) quest.title = dto.title;
    if (dto.description !== undefined) quest.description = dto.description || null;
    if (dto.image !== undefined) quest.image = dto.image || null;
    if (dto.point !== undefined) quest.point = Number(dto.point);
    if (dto.condition !== undefined) quest.condition = dto.condition;
    if (dto.action !== undefined) quest.action = dto.action || null;
    if (dto.interval !== undefined) quest.interval = dto.interval;
    if (dto.dateStart !== undefined) {
      quest.dateStart = dto.dateStart ? new Date(dto.dateStart) : null;
    }
    if (dto.dateEnd !== undefined) {
      quest.dateEnd = dto.dateEnd ? new Date(dto.dateEnd) : null;
    }
    if (dto.status !== undefined) quest.status = Number(dto.status);
    if (dto.isMain !== undefined) quest.isMain = Number(dto.isMain);

    const updated = await this.questRepo.save(quest);
    return this.mapQuestToItem(updated);
  }

  async deleteQuest(id: number): Promise<boolean> {
    const quest = await this.questRepo.findOne({
      where: { id },
    });

    if (!quest) {
      throw new NotFoundException(`Quest with ID ${id} not found`);
    }

    const res = await this.questRepo.softDelete(id);
    return (res.affected ?? 0) > 0;
  }

  async toggleStatus(id: number, status: number): Promise<boolean> {
    const quest = await this.questRepo.findOne({
      where: { id },
    });

    if (!quest) {
      throw new NotFoundException(`Quest with ID ${id} not found`);
    }

    const res = await this.questRepo.update(id, { status: Number(status) });
    return (res.affected ?? 0) > 0;
  }
}
