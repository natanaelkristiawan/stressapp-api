import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EntityManager, Repository, Like } from 'typeorm';
import { PostEntity } from '../entity/post.entity';
import { TagsEntity } from '../entity/tags.entity';
import { Activity } from '../entity/activity.entity';
import { AdminPostContentService } from './admin-post-content.service';
import {
  ContentCategoryNameDto,
  SavePsychoeducationDto,
} from './dtos/psychoeducation.dto';
import { ImportCells, parseContentWorkbook } from './content-import.format';
import { youtubeIdFromUrl } from './youtube';

export type ImportRow = {
  rowNumber: number;
  title: string;
  contentType: string;
  categoryNames: string[];
  newCategories: string[];
  status: 'ready' | 'duplicate' | 'error';
  errors: string[];
};
type PreparedRow = ImportRow & {
  input: SavePsychoeducationDto;
  importKey: string;
};

/** Matches the canonical category normalization already used by CMS category creation. */
function normalized(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}
/** Hashes stable identities without placing titles or file bytes in receipts/logs. */
function hash(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class ContentImportService {
  constructor(
    @InjectRepository(PostEntity, 'mimate')
    private readonly posts: Repository<PostEntity>,
    private readonly content: AdminPostContentService,
  ) {}

  /** Converts one spreadsheet row to the existing DTO and checks assets/rich text without persisting anything. */
  private async prepare(
    row: ImportCells,
    manager: EntityManager,
    seen: Set<string>,
  ): Promise<PreparedRow> {
    const [
      type,
      title,
      description,
      categoryCell,
      body,
      source,
      url,
      thumbnail,
    ] = row.values;
    const errors = [...row.errors];
    if (categoryCell.length > 2048) {
      errors.push('Category names cell must be at most 2048 characters.');
    }
    const names = new Map<string, string>();
    for (const part of categoryCell.slice(0, 2048).split(';')) {
      const name = normalized(part);
      if (name) {
        names.set(name.toLowerCase(), name);
      }
    }
    const categoryNames = [...names.values()];
    const input = plainToInstance(SavePsychoeducationDto, {
      contentType: type.trim(),
      title,
      description,
      body: body || null,
      videoSource: source.trim() || null,
      youtubeUrl: source.trim() === 'youtube' ? url.trim() : null,
      videoUrl: source.trim() === 'self' ? url.trim() : null,
      thumbnailUrl: thumbnail.trim() || null,
      status: 'draft',
    });
    const validations = await validate(input, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    for (const error of validations) {
      errors.push(...Object.values(error.constraints ?? {}));
    }
    if (categoryNames.length > 20) {
      errors.push('Select up to 20 categories per row.');
    }
    const newCategories: string[] = [];
    for (const name of categoryNames) {
      const category = plainToInstance(ContentCategoryNameDto, { name });
      if ((await validate(category)).length) {
        errors.push('Category names must contain 1–80 characters.');
        continue;
      }
      const existing = await manager.getRepository(TagsEntity).findOneBy({
        isContentCategory: true,
        categoryKey: hash(name.toLowerCase()),
      });
      if (existing?.categoryArchived) {
        errors.push(
          `Category "${name}" is archived. Restore it or remove it from this row.`,
        );
      }
      if (!existing) {
        newCategories.push(name);
      }
    }
    if (type.trim() === 'article' && url.trim()) {
      errors.push('Articles must leave videoUrl blank.');
    }
    let identity = `article:${normalized(input.title ?? '').toLowerCase()}`;
    if (type.trim() === 'video') {
      identity =
        source.trim() === 'youtube'
          ? `youtube:${youtubeIdFromUrl(url.trim()) ?? ''}`
          : `self:${url.trim()}`;
    }
    const importKey = hash(identity);
    if (!errors.length) {
      try {
        await this.content.validateImport(input, manager);
      } catch (error) {
        if (error instanceof BadRequestException) {
          errors.push(error.message);
        } else {
          throw error;
        }
      }
    }
    let duplicate = seen.has(importKey);
    if (!errors.length && !duplicate) {
      const query = manager
        .getRepository(PostEntity)
        .createQueryBuilder('post')
        .withDeleted()
        .where('post.isPsychoeducation = true');
      if (type.trim() === 'article') {
        query.andWhere(
          "(post.contentImportKey = :key OR (post.contentType = 'article' AND LOWER(TRIM(post.title)) = :title))",
          { key: importKey, title: normalized(input.title).toLowerCase() },
        );
      } else if (source.trim() === 'youtube') {
        query.andWhere(
          '(post.contentImportKey = :key OR post.youtubeId = :youtubeId)',
          { key: importKey, youtubeId: youtubeIdFromUrl(url.trim()) },
        );
      } else {
        query.andWhere(
          '(post.contentImportKey = :key OR post.videoUrl = :videoUrl)',
          { key: importKey, videoUrl: url.trim() },
        );
      }
      duplicate = await query.getExists();
    }
    seen.add(importKey);
    return {
      rowNumber: row.rowNumber,
      title: (input.title ?? '').slice(0, 200),
      contentType: type.trim(),
      categoryNames,
      newCategories,
      status: errors.length ? 'error' : duplicate ? 'duplicate' : 'ready',
      errors,
      input,
      importKey,
    };
  }

  /** Builds a safe row-by-row preview; file contents and untrusted HTML are never returned as markup. */
  private async prepareAll(rows: ImportCells[], manager: EntityManager) {
    const seen = new Set<string>();
    const prepared: PreparedRow[] = [];
    for (const row of rows) {
      prepared.push(await this.prepare(row, manager, seen));
    }
    return prepared;
  }

  /** Revalidates every upload; preview never creates categories or content. */
  async preview(buffer: Buffer) {
    const prepared = await this.prepareAll(
      await parseContentWorkbook(buffer),
      this.posts.manager,
    );
    return this.summary(prepared, hash(buffer));
  }

  /** Strips internal request/key data from the admin preview and explains all-or-nothing eligibility. */
  private summary(prepared: PreparedRow[], fileHash: string) {
    const rows: ImportRow[] = prepared.map((row) => ({
      rowNumber: row.rowNumber,
      title: row.title,
      contentType: row.contentType.slice(0, 20),
      categoryNames: row.categoryNames.slice(0, 21),
      newCategories: row.status === 'ready' ? row.newCategories : [],
      status: row.status,
      errors: row.errors,
    }));
    const readyCount = rows.filter((row) => row.status === 'ready').length;
    const duplicateCount = rows.filter(
      (row) => row.status === 'duplicate',
    ).length;
    const errorCount = rows.filter((row) => row.status === 'error').length;
    return {
      fileHash,
      totalCount: rows.length,
      readyCount,
      duplicateCount,
      errorCount,
      canImport: readyCount > 0 && errorCount === 0,
      rows,
    };
  }

  /** Serializes imports per database, validates again and commits all new categories/content in one transaction. */
  async commit(buffer: Buffer, expectedHash: string, actorId: number) {
    const fileHash = hash(buffer);
    if (fileHash !== expectedHash) {
      throw new ConflictException(
        'The file changed. Preview it again before importing.',
      );
    }
    const rows = await parseContentWorkbook(buffer);
    const runner = this.posts.manager.connection.createQueryRunner();
    await runner.connect();
    const lockName = `cms-content-import-${hash(
      String(this.posts.manager.connection.options.database),
    ).slice(0, 20)}`;
    // ponytail: serialize bounded CMS imports per database; use per-identity locks if import throughput grows.
    let locked = false;
    try {
      const result = await runner.query('SELECT GET_LOCK(?, 5) AS acquired', [
        lockName,
      ]);
      locked = Number(result[0].acquired) === 1;
      if (!locked) {
        throw new ConflictException(
          'Another import is running. Try again shortly.',
        );
      }
      await runner.startTransaction();
      const receipts = runner.manager.getRepository(Activity);
      const previous = await receipts.findOneBy({
        userId: actorId,
        action: 'content-import',
        source: 'cms-psychoeducation',
        message: Like(`{"hash":"${fileHash}",%`),
      });
      if (previous) {
        const receipt = JSON.parse(previous.message);
        await runner.commitTransaction();
        return {
          fileHash,
          importedCount: receipt.imported,
          skippedCount: receipt.skipped,
          totalCount: receipt.total,
          replayed: true,
        };
      }
      const prepared = await this.prepareAll(rows, runner.manager);
      const summary = this.summary(prepared, fileHash);
      if (summary.errorCount) {
        throw new BadRequestException(
          'Some rows are invalid. Preview the file again and correct all errors. Nothing was imported.',
        );
      }
      for (const row of prepared.filter((item) => item.status === 'ready')) {
        const categoryIds: number[] = [];
        for (const name of row.categoryNames) {
          let category = await runner.manager
            .getRepository(TagsEntity)
            .findOneBy({
              isContentCategory: true,
              categoryKey: hash(name.toLowerCase()),
            });
          if (!category) {
            const created = await this.content.saveCategory(
              { name },
              undefined,
              runner.manager,
            );
            category = await runner.manager
              .getRepository(TagsEntity)
              .findOneByOrFail({ id: created.id });
          }
          if (category.categoryArchived) {
            throw new ConflictException(
              'A category was archived. Preview the file again.',
            );
          }
          categoryIds.push(category.id);
        }
        await this.content.create(
          { ...row.input, categoryIds },
          actorId,
          runner.manager,
          row.importKey,
        );
      }
      await receipts.save({
        userId: actorId,
        action: 'content-import',
        source: 'cms-psychoeducation',
        message: JSON.stringify({
          hash: fileHash,
          imported: summary.readyCount,
          skipped: summary.duplicateCount,
          total: summary.totalCount,
        }),
      });
      await runner.commitTransaction();
      return {
        fileHash,
        importedCount: summary.readyCount,
        skippedCount: summary.duplicateCount,
        totalCount: summary.totalCount,
        replayed: false,
      };
    } catch (error) {
      if (runner.isTransactionActive) {
        await runner.rollbackTransaction();
      }
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'Content or categories changed during import. Preview the file again.',
        );
      }
      throw error;
    } finally {
      try {
        if (locked) {
          await runner.query('SELECT RELEASE_LOCK(?)', [lockName]);
        }
      } finally {
        await runner.release();
      }
    }
  }
}
