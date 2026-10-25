import * as ExcelJS from 'exceljs';
import { CONTENT_IMPORT_EXAMPLES } from './content-import.examples';
import { IMPORT_HEADERS } from './content-import.format';

/** Generates the same eight-column sample contract on the server without another runtime dependency. */
export async function contentImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const content = workbook.addWorksheet('Content', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  content.columns = IMPORT_HEADERS.map((key, index) => ({
    header: key,
    key,
    width: [12, 62, 28, 34, 28, 16, 54, 36][index],
  }));
  for (const values of CONTENT_IMPORT_EXAMPLES) {
    content.addRow(values);
  }
  content.autoFilter = 'A1:H18';
  content.eachRow((row, index) => {
    row.height = index === 1 ? 28 : 44;
    row.alignment = { vertical: 'middle', wrapText: true };
    row.font = { name: 'Arial', size: 11 };
    if (index === 1) {
      row.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC45124' },
      };
    }
  });
  for (let index = 2; index <= 201; index++) {
    content.getCell(`A${index}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"article,video"'],
    };
    content.getCell(`F${index}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"youtube,self"'],
    };
  }
  const guide = workbook.addWorksheet('Guide');
  guide.columns = [{ width: 24 }, { width: 110 }];
  guide.addRows([
    ['Content import instructions', ''],
    [
      'Rows',
      'One article/video per row in Content. Keep the eight headers unchanged. Delete sample rows you do not want to import. Maximum 200 data rows, 2 MiB file.',
    ],
    ['type', 'Required: article or video.'],
    ['title', 'Required, maximum 200 characters.'],
    ['description', 'Optional, maximum 255 characters.'],
    [
      'categories',
      'Optional names separated by semicolons, up to 20 per item, each 1–80 characters. Missing categories are created automatically on confirmation. Archived categories must be restored first.',
    ],
    [
      'articleBody',
      'Rich-text HTML required for articles; blank for videos. The API sanitizes HTML.',
    ],
    ['videoSource', 'Videos: youtube or self. Articles: blank.'],
    [
      'videoUrl',
      'Videos: YouTube link, or an existing CMS-uploaded video URL for self. Articles: blank.',
    ],
    [
      'thumbnailUrl',
      'Optional existing CMS-uploaded image URL. Upload assets separately; do not enter a local path or an arbitrary external image URL.',
    ],
    [
      'Status',
      'All imported items start as drafts. Preview does not save anything. Confirm only after reviewing every row.',
    ],
    [
      'Validation',
      'Use literal text, not formulas. Fix all row errors before importing. Do not use password protection, macros or external-workbook links.',
    ],
    [
      'Duplicates',
      'Duplicates within the file or existing content are skipped. YouTube uses video ID; self-hosted uses video URL; articles use the normalized title. Existing content is never overwritten.',
    ],
    [
      'Sample source',
      'Database TEMUSOBAT - Psychoeducation youtube content.csv: 17 supplied YouTube videos. Category labels are editable example suggestions; descriptions/thumbnails were not supplied.',
    ],
    [
      'Video availability',
      'Link syntax is validated; YouTube availability and embedding permission must be reviewed by the admin.',
    ],
  ]);
  guide.eachRow((row, index) => {
    row.height = index === 1 ? 28 : 46;
    row.alignment = { vertical: 'middle', wrapText: true };
    row.font = { name: 'Arial', size: 11 };
    if (index === 1) {
      row.font = { name: 'Arial', size: 14, bold: true };
    }
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
