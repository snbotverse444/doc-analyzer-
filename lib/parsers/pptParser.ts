import JSZip from 'jszip';

export interface ParsedSlide {
  title: string;
  rawText: string;
}

export interface ParsedImage {
  location: string;
  base64: string;
  mimeType: string;
}

export interface ParsedPptDocument {
  sections: ParsedSlide[];
  images: ParsedImage[];
}

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  emf: 'image/x-emf',
  wmf: 'image/x-wmf'
};

function slideNumber(fileName: string): number {
  const match = fileName.match(/slide(\d+)\.xml$/);
  return match ? parseInt(match[1], 10) : 0;
}

function extractText(xml: string): string {
  const runs = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => m[1]);
  return runs
    .join(' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses a .pptx buffer (a zip archive) into per-slide text plus any embedded
 * raster images (charts/diagrams pasted as pictures), skipping vector-only
 * shapes drawn natively in PowerPoint (those have no extractable image asset).
 */
export async function parsePpt(buffer: Buffer): Promise<ParsedPptDocument> {
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  const sections: ParsedSlide[] = [];
  const images: ParsedImage[] = [];

  for (const slideFile of slideFiles) {
    const num = slideNumber(slideFile);
    const xml = await zip.files[slideFile].async('string');
    const text = extractText(xml);

    sections.push({
      title: `Slide ${num}`,
      rawText: text || '(No text content on this slide)'
    });

    // Look up this slide's relationships to find embedded images.
    const relsPath = `ppt/slides/_rels/slide${num}.xml.rels`;
    const relsFile = zip.files[relsPath];
    if (!relsFile) continue;

    const relsXml = await relsFile.async('string');
    const imageTargets = [
      ...relsXml.matchAll(/Type="[^"]*\/image"[^>]*Target="([^"]+)"/g)
    ].map((m) => m[1]);

    for (const target of imageTargets) {
      const mediaPath = target.replace('../media/', 'ppt/media/');
      const mediaFile = zip.files[mediaPath];
      if (!mediaFile) continue;

      const ext = mediaPath.split('.').pop()?.toLowerCase() || '';
      const mimeType = MIME_BY_EXT[ext];
      if (!mimeType) continue; // skip unsupported/vector formats

      const base64 = await mediaFile.async('base64');
      images.push({
        location: `PowerPoint - Slide ${num}`,
        base64,
        mimeType
      });
    }
  }

  return { sections, images };
}
