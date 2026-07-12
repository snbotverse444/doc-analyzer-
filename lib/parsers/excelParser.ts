import * as XLSX from 'xlsx';

export interface ParsedSheet {
  title: string;
  rawText: string;
}

/**
 * Parses every sheet in an Excel workbook into a text representation
 * (title + CSV-like rows) that can be handed to an LLM for summarization.
 */
export function parseExcel(buffer: Buffer): ParsedSheet[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    const rowCount = XLSX.utils.sheet_to_json(sheet, { header: 1 }).length;

    return {
      title: sheetName,
      rawText: `Sheet "${sheetName}" (${rowCount} rows):\n${csv}`
    };
  });
}
