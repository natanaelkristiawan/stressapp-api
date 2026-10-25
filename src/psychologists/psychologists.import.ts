import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import * as ExcelJS from 'exceljs';
import {
  validateImportArchive,
  compatibleWorkbook,
  cellText,
} from '../admin-post/content-import.format';
import { Activity } from '../entity/activity.entity';
import { PsychologistLocation } from '../entity/psychologist-location.entity';
import { LocationInputDto } from './psychologists.dto';
import { locationKey, validateLocation } from './psychologists.service';
import { LOCATION_EXAMPLES } from './psychologists.examples';

export const LOCATION_HEADERS = [
  'name',
  'branch',
  'city',
  'address',
  'phone',
  'contactType',
  'contactNotes',
  'website',
  'serviceMode',
  'latitude',
  'longitude',
];
type PreviewRow = {
  rowNumber: number;
  input: LocationInputDto;
  errors: string[];
  duplicate: boolean;
};
@Injectable()
export class PsychologistsImport {
  constructor(@InjectDataSource('mimate') private readonly db: DataSource) {}
  /** Downloads the supplied directory as editable branch rows, preserving missing coordinates. */
  async template() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Locations');
    sheet.addRow(LOCATION_HEADERS);
    for (const input of LOCATION_EXAMPLES) {
      sheet.addRow(LOCATION_HEADERS.map((header) => input[header] ?? ''));
    }
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: 'K1' };
    sheet.columns.forEach((column) => {
      column.width = 24;
    });
    sheet.getColumn(4).width = 70;
    sheet.getColumn(5).numFmt = '@';
    sheet.eachRow((row) => {
      row.alignment = { vertical: 'top', wrapText: true };
    });
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' },
    };
    const guide = workbook.addWorksheet('Guide');
    guide.addRows([
      ['Field', 'Instructions'],
      [
        'Import',
        'Preview changes, then confirm. New rows are published immediately. Existing branches are skipped, never overwritten.',
      ],
      [
        'Rows',
        'One row per branch. Keep exact Locations headers. Maximum 200 rows and 2 MiB.',
      ],
      ['phone', 'Text only. Preserve leading zero or use 62 country prefix.'],
      [
        'contactType',
        'whatsapp or telephone. The supplied 021 landline is telephone; WhatsApp availability is not independently verified.',
      ],
      [
        'serviceMode',
        'onsite or online. Online services have no physical coordinates.',
      ],
      [
        'latitude / longitude',
        'Leave both blank until confirmed. Enter both as decimal numbers for a physical branch. No coordinates were supplied in the original CSV.',
      ],
      [
        'Source',
        'Database TEMUSOBAT - Counselling center contact details.csv; 33 original records. Contacts have not been independently verified.',
      ],
    ]);
    guide.getColumn(1).width = 26;
    guide.getColumn(2).width = 105;
    guide.eachRow((row) => {
      row.alignment = { wrapText: true, vertical: 'top' };
      row.height = 36;
    });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
  /** Validates literal XLSX cells and all DTO/business boundaries without writing any rows. */
  async preview(buffer: Buffer) {
    validateImportArchive(buffer);
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(await compatibleWorkbook(buffer), {
        ignoreNodes: ['tableParts'],
      });
    } catch {
      throw new BadRequestException('Unable to read the Locations workbook.');
    }
    const sheet = workbook.getWorksheet('Locations');
    if (
      !sheet ||
      workbook.worksheets.length > 5 ||
      sheet.columnCount > LOCATION_HEADERS.length ||
      sheet.rowCount > 1000
    ) {
      throw new BadRequestException('Use the downloaded Locations template.');
    }
    try {
      if (
        LOCATION_HEADERS.some(
          (header, index) =>
            cellText(sheet.getRow(1).getCell(index + 1)) !== header,
        )
      ) {
        throw new Error('headers');
      }
    } catch {
      throw new BadRequestException(
        'Keep the exact Locations template headers.',
      );
    }
    const rows: PreviewRow[] = [];
    const seen = new Set<string>();
    for (let number = 2; number <= sheet.rowCount; number++) {
      const row = sheet.getRow(number);
      if (!row.hasValues) {
        continue;
      }
      const errors: string[] = [];
      const values: Record<string, unknown> = { status: 'published' };
      for (const [index, header] of LOCATION_HEADERS.entries()) {
        try {
          const cell = row.getCell(index + 1);
          if (header === 'latitude' || header === 'longitude') {
            const value = cell.value;
            if (typeof value === 'number') {
              values[header] = value;
            } else {
              const text = cellText(cell).trim();
              if (text === '') {
                values[header] = null;
              } else if (/^-?\d+(\.\d+)?$/.test(text)) {
                values[header] = Number(text);
              } else {
                values[header] = text;
              }
            }
          } else {
            values[header] = cellText(cell).trim();
          }
        } catch {
          values[header] =
            header === 'latitude' || header === 'longitude' ? null : '';
          errors.push(
            `${header}: use literal text or coordinate numbers; no formulas.`,
          );
        }
      }
      const input = plainToInstance(LocationInputDto, values);
      const validation = await validate(input, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      for (const error of validation) {
        errors.push(...Object.values(error.constraints ?? {}));
      }
      if (!errors.length) {
        try {
          validateLocation(input);
        } catch (error) {
          errors.push(error.message);
        }
      }
      const key = errors.length ? '' : locationKey(input);
      const duplicate = Boolean(
        key &&
          (seen.has(key) ||
            (await this.db.getRepository(PsychologistLocation).findOne({
              where: { identityKey: key },
              withDeleted: true,
              select: { id: true },
            }))),
      );
      if (key) {
        seen.add(key);
      }
      rows.push({ rowNumber: number, input, errors, duplicate });
    }
    if (!rows.length || rows.length > 200) {
      throw new BadRequestException('Include 1–200 location rows.');
    }
    return {
      fileHash: createHash('sha256').update(buffer).digest('hex'),
      rows,
      canImport: rows.every((row) => !row.errors.length),
    };
  }
  /** Revalidates the reviewed file and atomically publishes new branches; retries skip existing identities. */
  async commit(buffer: Buffer, expectedHash: string, actorId: number) {
    const preview = await this.preview(buffer);
    if (preview.fileHash !== expectedHash || !preview.canImport) {
      throw new BadRequestException(
        'Preview this exact valid file before importing.',
      );
    }
    return this.db.transaction(async (manager) => {
      let created = 0;
      let skipped = 0;
      for (const row of preview.rows) {
        try {
          await manager
            .getRepository(PsychologistLocation)
            .insert({ ...row.input, identityKey: locationKey(row.input) });
          created++;
        } catch (error) {
          if (error.code !== 'ER_DUP_ENTRY') {
            throw error;
          }
          skipped++;
        }
      }
      await manager.getRepository(Activity).save({
        action: 'psychologist-import',
        source: 'cms-psychologists',
        message: JSON.stringify({
          actorId,
          created,
          skipped,
          fileHash: expectedHash,
        }),
      });
      return { created, skipped };
    });
  }
}
