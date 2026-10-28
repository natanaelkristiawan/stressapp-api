import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Activity } from '../entity/activity.entity';
import { NotificationType } from '../entity/member-notification.entity';
import { NotificationTemplate } from '../entity/notification-template.entity';
import { SaveNotificationTemplateDto } from './notification-templates.dto';
import {
  renderTemplateText,
  templatePlaceholders,
  validateTemplateText,
} from './notification-templates.render';

/** Exposes configured text or a write-free unconfigured slot, with editor metadata. */
function templateView(
  type: NotificationType,
  row?: NotificationTemplate | null,
) {
  return {
    type,
    configured: !!row,
    title: row?.title ?? '',
    body: row?.body ?? '',
    revision: row?.revision ?? 0,
    placeholders: templatePlaceholders(type),
    createdAt: row?.createdAt.toISOString() ?? null,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

@Injectable()
export class NotificationTemplatesService {
  constructor(@InjectDataSource('mimate') private readonly db: DataSource) {}

  /** Lists all four fixed template slots without seeding or modifying the database. */
  async list() {
    const rows = await this.db.getRepository(NotificationTemplate).find();
    const items = Object.values(NotificationType).map((type) =>
      templateView(
        type,
        rows.find((row) => row.type === type),
      ),
    );
    return { items, total: items.length, page: 1, pageSize: items.length };
  }

  /** Returns one fixed template slot and its current revision. */
  async detail(type: NotificationType) {
    return templateView(
      type,
      await this.db.getRepository(NotificationTemplate).findOneBy({ type }),
    );
  }

  /** Saves a reviewed template and its metadata-only audit in one transaction. */
  async save(
    type: NotificationType,
    input: SaveNotificationTemplateDto,
    actorId: number,
  ) {
    validateTemplateText(type, input.title, input.body);
    try {
      return await this.db.transaction(async (manager) => {
        const existing = await manager.findOne(NotificationTemplate, {
          where: { type },
          lock: { mode: 'pessimistic_write' },
        });
        if ((existing?.revision ?? 0) !== input.revision) {
          throw new ConflictException(
            'Template changed. Reload before saving.',
          );
        }
        const row = manager.create(NotificationTemplate, {
          ...existing,
          type,
          title: input.title,
          body: input.body,
          revision: input.revision + 1,
        });
        const saved = await manager.save(NotificationTemplate, row);
        await manager.save(Activity, {
          source: 'cms-notification-templates',
          action: 'notification-template-save',
          userId: actorId,
          message: JSON.stringify({ type, revision: saved.revision }),
        });
        return templateView(type, saved);
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        ['ER_DUP_ENTRY', 'ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(
          String(error.code),
        )
      ) {
        throw new ConflictException(
          'Template changed or is busy. Reload before saving.',
        );
      }
      throw error;
    }
  }

  /** Returns an immutable text snapshot for future trusted event producers; sends nothing. */
  async render(type: NotificationType, values: unknown) {
    templatePlaceholders(type);
    const template = await this.db
      .getRepository(NotificationTemplate)
      .findOneBy({ type });
    if (!template) {
      throw new ServiceUnavailableException(
        'Notification template is not configured.',
      );
    }
    return {
      type,
      ...renderTemplateText(type, template.title, template.body, values),
      templateRevision: template.revision,
    };
  }
}
