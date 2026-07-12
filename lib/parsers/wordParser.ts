import mammoth from 'mammoth';

export interface ParsedDocSection {
  title: string;
  rawText: string;
}

export interface ParsedImage {
  location: string;
  base64: string;
  mimeType: string;
}

export interface ParsedWordDocument {
  sections: ParsedDocSection[];
  images: ParsedImage[];
}

/**
 * Parses a .docx buffer into heading-delimited sections plus any embedded images
 * (kept separately so they can be described by a vision model and folded back
 * into the relevant section's context).
 */
export async function parseWord(buffer: Buffer): Promise<ParsedWordDocument> {
  const images: ParsedImage[] = [];
  let imageCounter = 0;

  const result = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        imageCounter += 1;
        const base64 = await image.readAsBase64String();
        const mimeType = image.contentType || 'image/png';
        const marker = `__IMAGE_MARKER_${imageCounter}__`;
        images.push({ location: marker, base64, mimeType });
        return { src: marker };
      })
    }
  );

  const html = result.value;

  // Split on heading tags (h1-h3) to build logical sections.
  const headingRegex = /<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi;
  const matches = [...html.matchAll(headingRegex)];

  const sections: ParsedDocSection[] = [];

  if (matches.length === 0) {
    sections.push({
      title: 'Document Body',
      rawText: stripHtml(html)
    });
  } else {
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const start = current.index ?? 0;
      const end = next?.index ?? html.length;
      const chunk = html.slice(start, end);
      const title = stripHtml(current[1]).trim() || `Section ${i + 1}`;
      sections.push({ title, rawText: stripHtml(chunk) });
    }
  }

  // Re-map image markers to the section title they fell inside (best effort).
  const remappedImages: ParsedImage[] = images.map((img) => {
    const owningSection = sections.find((s) => s.rawText.includes(img.location));
    return {
      ...img,
      location: owningSection ? `Word document - ${owningSection.title}` : 'Word document'
    };
  });

  // Strip leftover markers from section text now that we've captured ownership.
  const cleanedSections = sections.map((s) => ({
    ...s,
    rawText: s.rawText.replace(/__IMAGE_MARKER_\d+__/g, '[image omitted from text]')
  }));

  return { sections: cleanedSections, images: remappedImages };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
