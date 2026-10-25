import { inflateRawSync } from 'zlib';
import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import JSZip = require('jszip');
import { SaxesParser } from 'saxes';

export const IMPORT_HEADERS = [
  'type',
  'title',
  'description',
  'categories',
  'articleBody',
  'videoSource',
  'videoUrl',
  'thumbnailUrl',
];
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 200;
export type ImportCells = {
  rowNumber: number;
  values: string[];
  errors: string[];
};

/** Bounds ZIP expansion before ExcelJS inflates anything; rejects encrypted, ZIP64 and external-workbook content. */
export function validateImportArchive(buffer: Buffer): void {
  if (!buffer.length || buffer.length > MAX_IMPORT_BYTES) {
    throw new BadRequestException('Upload an .xlsx file up to 2 MiB.');
  }
  let end = -1;
  for (
    let index = buffer.length - 22;
    index >= Math.max(0, buffer.length - 65557);
    index--
  ) {
    if (
      buffer.readUInt32LE(index) === 0x06054b50 &&
      index + 22 + buffer.readUInt16LE(index + 20) === buffer.length
    ) {
      end = index;
      break;
    }
  }
  if (end < 0 || buffer.readUInt16LE(end + 4) || buffer.readUInt16LE(end + 6)) {
    throw new BadRequestException('Invalid Excel ZIP container.');
  }
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const directorySize = buffer.readUInt32LE(end + 12);
  if (!count || count > 100 || offset + directorySize !== end) {
    throw new BadRequestException(
      'Excel archive has too many entries or an invalid directory.',
    );
  }
  let expanded = 0;
  const names = new Set<string>();
  const directoryStart = offset;
  for (let entry = 0; entry < count; entry++) {
    if (offset + 46 > end || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new BadRequestException('Invalid Excel archive entry.');
    }
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const size = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (next > end) {
      throw new BadRequestException('Invalid Excel archive entry size.');
    }
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    expanded += size;
    if (
      flags & 1 ||
      ![0, 8].includes(method) ||
      size > 10 * 1024 * 1024 ||
      expanded > 20 * 1024 * 1024 ||
      name.includes('..') ||
      name.includes('\\') ||
      name.startsWith('/') ||
      /externalLinks|vbaProject/i.test(name)
    ) {
      throw new BadRequestException(
        'Excel file is encrypted, too large when expanded, or contains unsupported external/macro content.',
      );
    }
    if (names.has(name)) {
      throw new BadRequestException(
        'Duplicate Excel ZIP entries are not supported.',
      );
    }
    names.add(name);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    if (
      localOffset + 30 > directoryStart ||
      buffer.readUInt32LE(localOffset) !== 0x04034b50
    ) {
      throw new BadRequestException('Invalid Excel ZIP local entry.');
    }
    if (
      buffer.readUInt16LE(localOffset + 8) !== method ||
      buffer.readUInt16LE(localOffset + 6) & 1
    ) {
      throw new BadRequestException(
        'Inconsistent Excel ZIP compression metadata.',
      );
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    if (
      buffer.toString(
        'utf8',
        localOffset + 30,
        localOffset + 30 + localNameLength,
      ) !== name
    ) {
      throw new BadRequestException('Inconsistent Excel ZIP entry name.');
    }
    const dataStart =
      localOffset +
      30 +
      buffer.readUInt16LE(localOffset + 26) +
      buffer.readUInt16LE(localOffset + 28);
    if (dataStart + compressedSize > directoryStart) {
      throw new BadRequestException('Invalid Excel ZIP data size.');
    }
    try {
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      const actual =
        method === 8
          ? inflateRawSync(compressed, {
              maxOutputLength: Math.max(
                1,
                Math.min(size + 1, 10 * 1024 * 1024),
              ),
            })
          : compressed;
      if (
        actual.length !== size ||
        (/\.xml$/i.test(name) &&
          /<!DOCTYPE|<!ENTITY/i.test(actual.toString('utf8')))
      ) {
        throw new Error('Invalid XML or size');
      }
    } catch {
      throw new BadRequestException(
        'Excel archive expansion or XML content is invalid.',
      );
    }
    offset = next;
  }
  if (offset !== end) {
    throw new BadRequestException('Invalid Excel archive directory.');
  }
}

/** Extracts literal cells only; formulas/errors cannot bypass DTO validation through cached values. */
export function cellText(cell: ExcelJS.Cell): string {
  if (
    cell.type === ExcelJS.ValueType.Formula ||
    cell.type === ExcelJS.ValueType.Error
  ) {
    throw new Error(
      'Formulas and Excel error cells are not supported. Use literal values.',
    );
  }
  if (cell.value === null || cell.value === undefined) {
    return '';
  }
  if (typeof cell.value === 'string') {
    return cell.value;
  }
  if (
    cell.type === ExcelJS.ValueType.Hyperlink &&
    typeof cell.value === 'object' &&
    'hyperlink' in cell.value
  ) {
    return cell.value.hyperlink;
  }
  if (cell.type === ExcelJS.ValueType.RichText) {
    return cell.text;
  }
  throw new Error('Use text values in the import columns.');
}

/** Adapts valid prefixed SpreadsheetML (including our original sample) to ExcelJS's unprefixed tag parser. */
export async function compatibleWorkbook(buffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const spreadsheetNamespace =
    'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  let changed = false;
  const escapeXml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  for (const entry of Object.values(zip.files)) {
    if (!entry.name.endsWith('.xml')) {
      continue;
    }
    const xml = await entry.async('string');
    if (
      !/<[\w.-]+:(?:workbook|worksheet|styleSheet|sst|table)(?:\s|>)/.test(xml)
    ) {
      continue;
    }
    const parser = new SaxesParser({ xmlns: true });
    const output: string[] = [];
    let root = true;
    let normalize = false;
    parser.on('opentag', (tag) => {
      if (root) {
        normalize = tag.uri === spreadsheetNamespace && Boolean(tag.prefix);
      }
      const name =
        normalize && tag.uri === spreadsheetNamespace ? tag.local : tag.name;
      const attributes = Object.values(tag.attributes)
        .map(
          (attribute) => ` ${attribute.name}="${escapeXml(attribute.value)}"`,
        )
        .join('');
      const defaultNamespace =
        root && normalize && !tag.attributes.xmlns
          ? ` xmlns="${spreadsheetNamespace}"`
          : '';
      output.push(`<${name}${attributes}${defaultNamespace}>`);
      root = false;
    });
    parser.on('closetag', (tag) => {
      const name =
        normalize && tag.uri === spreadsheetNamespace ? tag.local : tag.name;
      output.push(`</${name}>`);
    });
    parser.on('text', (value) => output.push(escapeXml(value)));
    parser.on('cdata', (value) => output.push(escapeXml(value)));
    parser.write(xml).close();
    if (normalize) {
      zip.file(entry.name, output.join(''));
      changed = true;
    }
  }
  return changed
    ? zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    : buffer;
}

/** Reads the named Content sheet and exact eight-column template; other sheets are instructions only. */
export async function parseContentWorkbook(
  buffer: Buffer,
): Promise<ImportCells[]> {
  validateImportArchive(buffer);
  const workbook = new ExcelJS.Workbook();
  try {
    // Table formatting is irrelevant to cell import; ExcelJS cannot resolve some valid absolute table relationships.
    await workbook.xlsx.load(await compatibleWorkbook(buffer), {
      ignoreNodes: ['tableParts'],
    });
  } catch {
    throw new BadRequestException(
      'Unable to read this Excel file. Use the downloaded .xlsx template.',
    );
  }
  const sheet = workbook.getWorksheet('Content');
  if (
    !sheet ||
    workbook.worksheets.length > 5 ||
    sheet.columnCount > 8 ||
    sheet.rowCount > 1000
  ) {
    throw new BadRequestException(
      'Use the Content sheet with exactly eight template columns and at most 200 data rows.',
    );
  }
  try {
    if (
      IMPORT_HEADERS.some(
        (header, index) =>
          cellText(sheet.getRow(1).getCell(index + 1)).trim() !== header,
      )
    ) {
      throw new Error('Headers');
    }
  } catch {
    throw new BadRequestException(
      `Keep these Content headers in order: ${IMPORT_HEADERS.join(', ')}.`,
    );
  }
  const rows: ImportCells[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }
    const values: string[] = [];
    const errors: string[] = [];
    for (let index = 0; index < 8; index++) {
      try {
        values.push(cellText(row.getCell(index + 1)));
      } catch (error) {
        values.push('');
        errors.push(`${IMPORT_HEADERS[index]}: ${error.message}`);
      }
    }
    if (values.every((value) => !value.trim()) && !errors.length) {
      return;
    }
    rows.push({ rowNumber, values, errors });
  });
  if (!rows.length || rows.length > MAX_IMPORT_ROWS) {
    throw new BadRequestException('Include 1–200 content rows.');
  }
  return rows;
}
