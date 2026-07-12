import type { SupportedFileType } from '../types';
import { parseExcel } from './excelParser';
import { parseWord } from './wordParser';
import { parsePpt } from './pptParser';
import { parseText } from './textParser';

export interface GenericSection {
  title: string;
  rawText: string;
}

export interface GenericImage {
  location: string;
  base64: string;
  mimeType: string;
}

export interface ParseResult {
  sections: GenericSection[];
  images: GenericImage[];
}

export function detectFileType(fileName: string): SupportedFileType | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') return ext;
  if (ext === 'docx') return 'docx';
  if (ext === 'pptx') return 'pptx';
  if (ext === 'txt') return 'txt';
  return null;
}

export async function parseDocument(
  buffer: Buffer,
  fileType: SupportedFileType
): Promise<ParseResult> {
  switch (fileType) {
    case 'xlsx':
    case 'xls': {
      const sheets = parseExcel(buffer);
      return { sections: sheets, images: [] };
    }
    case 'docx': {
      const { sections, images } = await parseWord(buffer);
      return { sections, images };
    }
    case 'pptx': {
      const { sections, images } = await parsePpt(buffer);
      return { sections, images };
    }
    case 'txt': {
      const sections = parseText(buffer);
      return { sections, images: [] };
    }
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
