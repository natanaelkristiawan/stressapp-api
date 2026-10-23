import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { SettingEntity } from '../entity/setting.entity';
import {
  DEFAULT_MESSAGES,
  VIOLATION_TYPES,
  ViolationType,
  violationType,
} from './moderation-policy';

const KEY = 'moderation.notification-messages.v1';
@Injectable()
export class ModerationMessagesService {
  constructor(
    @InjectRepository(SettingEntity, 'mimate')
    private readonly settings: Repository<SettingEntity>,
  ) {}

  /** Initializes only a missing settings row; concurrent first reads never overwrite admin edits. */
  async read() {
    let row = await this.settings.findOneBy({ key: KEY });
    if (!row) {
      await this.settings
        .createQueryBuilder()
        .insert()
        .values({
          key: KEY,
          value: JSON.stringify(DEFAULT_MESSAGES),
          description: 'Member moderation notification messages',
        })
        .orIgnore()
        .execute();
      row = await this.settings.findOneBy({ key: KEY });
    }
    return this.parse(row?.value);
  }

  /** Rejects missing/corrupted settings instead of silently approving or emitting blank messages. */
  private parse(value: string | undefined) {
    try {
      const data: unknown = JSON.parse(value);
      if (
        !data ||
        typeof data !== 'object' ||
        Array.isArray(data) ||
        Object.keys(data).length !== 4
      ) {
        throw new Error();
      }
      const messages = data as Record<ViolationType, unknown>;
      for (const type of VIOLATION_TYPES) {
        if (
          typeof messages[type] !== 'string' ||
          !String(messages[type]).trim() ||
          String(messages[type]).length > 2000
        ) {
          throw new Error();
        }
      }
      return {
        messages: messages as Record<ViolationType, string>,
        version: createHash('sha256').update(value).digest('hex'),
      };
    } catch {
      throw new ServiceUnavailableException(
        'Moderation messages are unavailable.',
      );
    }
  }

  /** Returns the configured message for one confirmed category. */
  async messageFor(type: ViolationType): Promise<string> {
    return (await this.read()).messages[type];
  }

  /** Resolves only rejected decisions; corrupt/missing types stay nonpublic rather than using another message. */
  async forResult(result: {
    action: string;
    type?: string;
    categories?: string[];
  }): Promise<string | null> {
    if (result.action !== 'reject') {
      return null;
    }
    const type = violationType(result);
    if (!type) {
      throw new ServiceUnavailableException('Moderation type is unavailable.');
    }
    return this.messageFor(type);
  }

  /** Updates the four fixed messages atomically; stale CMS forms must reload before overwriting edits. */
  async save(messages: Record<ViolationType, string>, version: string) {
    await this.read();
    return this.settings.manager.transaction(async (manager) => {
      const row = await manager
        .getRepository(SettingEntity)
        .findOne({ where: { key: KEY }, lock: { mode: 'pessimistic_write' } });
      if (this.parse(row?.value).version !== version) {
        throw new ConflictException('Messages changed. Reload before saving.');
      }
      row.value = JSON.stringify(messages);
      const result = this.parse(row.value);
      await manager.getRepository(SettingEntity).save(row);
      return result;
    });
  }
}
