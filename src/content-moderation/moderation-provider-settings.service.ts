import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'crypto';
import { Repository } from 'typeorm';
import { SettingEntity } from '../entity/setting.entity';

export const MODERATION_PROVIDER_KEY = 'moderation.private-provider.v1';
const ENV_VERSION = '0'.repeat(64);
export type ModerationProvider = {
  apiKey: string;
  model: string;
  version: string;
};

@Injectable()
export class ModerationProviderSettingsService {
  constructor(
    @InjectRepository(SettingEntity, 'mimate')
    private readonly settings: Repository<SettingEntity>,
    private readonly config: ConfigService,
  ) {}

  /** Reads current credentials per operation so every API/worker process sees CMS changes. */
  async read(): Promise<ModerationProvider> {
    try {
      const row = await this.settings.findOneBy({
        key: MODERATION_PROVIDER_KEY,
      });
      if (!row?.value) {
        return {
          apiKey: this.config.get<string>('OPENCODE_API_KEY') || '',
          model: this.config.get<string>('OPENCODE_MODERATION_MODEL') || '',
          version: ENV_VERSION,
        };
      }
      const [iv, tag, ciphertext] = row.value.split('.');
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey(),
        Buffer.from(iv, 'base64'),
      );
      decipher.setAAD(Buffer.from(MODERATION_PROVIDER_KEY));
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      const data: unknown = JSON.parse(
        Buffer.concat([
          decipher.update(Buffer.from(ciphertext, 'base64')),
          decipher.final(),
        ]).toString('utf8'),
      );
      if (
        !data ||
        typeof data !== 'object' ||
        !('apiKey' in data) ||
        !('model' in data)
      ) {
        throw new Error();
      }
      const provider = data as { apiKey: unknown; model: unknown };
      if (
        typeof provider.apiKey !== 'string' ||
        !/^[\x21-\x7e]{1,4096}$/.test(provider.apiKey) ||
        typeof provider.model !== 'string' ||
        !/^[A-Za-z0-9._-]{1,100}$/.test(provider.model)
      ) {
        throw new Error();
      }
      return {
        apiKey: provider.apiKey,
        model: provider.model,
        version: this.version(row.value),
      };
    } catch {
      // Never surface database/crypto errors, which can contain stored credentials.
      throw new ServiceUnavailableException(
        'Moderation provider settings are unavailable.',
      );
    }
  }

  /** Returns only presence, model and concurrency version; never returns any part of the key. */
  async status() {
    const provider = await this.read();
    return {
      configured: Boolean(
        provider.apiKey && /^[A-Za-z0-9._-]{1,100}$/.test(provider.model),
      ),
      model: provider.model,
      version: provider.version,
    };
  }

  /** Saves an encrypted snapshot atomically; an empty key preserves the current/environment key. */
  async save(input: { apiKey: string; model: string; version: string }) {
    const current = await this.read();
    const apiKey = input.apiKey || current.apiKey;
    if (
      !/^[\x21-\x7e]{1,4096}$/.test(apiKey) ||
      !/^[A-Za-z0-9._-]{1,100}$/.test(input.model)
    ) {
      throw new BadRequestException('A valid API key and model are required.');
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    cipher.setAAD(Buffer.from(MODERATION_PROVIDER_KEY));
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify({ apiKey, model: input.model }), 'utf8'),
      cipher.final(),
    ]);
    const value = [iv, cipher.getAuthTag(), ciphertext]
      .map((part) => part.toString('base64'))
      .join('.');
    try {
      await this.settings
        .createQueryBuilder()
        .insert()
        .values({
          key: MODERATION_PROVIDER_KEY,
          value: null,
          description: 'Private encrypted moderation provider configuration',
        })
        .orIgnore()
        // Ignored MySQL inserts have no generated ID to hydrate.
        .updateEntity(false)
        .execute();
      await this.settings.manager.transaction(async (manager) => {
        const repository = manager.getRepository(SettingEntity);
        const row = await repository.findOne({
          where: { key: MODERATION_PROVIDER_KEY },
          lock: { mode: 'pessimistic_write' },
        });
        if (
          !row ||
          (row.value ? this.version(row.value) : ENV_VERSION) !== input.version
        ) {
          throw new ConflictException(
            'Provider settings changed. Reload before saving.',
          );
        }
        row.value = value;
        await repository.save(row);
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        'Unable to save moderation provider settings.',
      );
    }
    return {
      configured: true,
      model: input.model,
      version: this.version(value),
    };
  }

  /** Derives a purpose-specific storage key from the existing private server secret. */
  private encryptionKey(): Buffer {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException(
        'Server secret is required to save provider settings.',
      );
    }
    return createHmac('sha256', secret)
      .update(MODERATION_PROVIDER_KEY)
      .digest();
  }

  /** Uses ciphertext as an opaque version, so changing either field invalidates old cached checks. */
  private version(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
