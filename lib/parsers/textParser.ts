export interface ParsedTextSection {
  title: string;
  rawText: string;
}

/**
 * Splits a plain text file into sections. If the file uses markdown-style
 * headings (#, ##) those are used as section boundaries; otherwise the whole
 * file is treated as a single section.
 */
export function parseText(buffer: Buffer): ParsedTextSection[] {
  const content = buffer.toString('utf-8');
  const lines = content.split(/\r?\n/);

  const headingRegex = /^(#{1,3})\s+(.*)/;
  const hasHeadings = lines.some((l) => headingRegex.test(l));

  if (!hasHeadings) {
    return [{ title: 'Document', rawText: content.trim() }];
  }

  const sections: ParsedTextSection[] = [];
  let currentTitle = 'Introduction';
  let currentLines: string[] = [];

  const flush = () => {
    if (currentLines.length) {
      sections.push({ title: currentTitle, rawText: currentLines.join('\n').trim() });
    }
  };

  for (const line of lines) {
    const match = line.match(headingRegex);
    if (match) {
      flush();
      currentTitle = match[2].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  flush();

  return sections.length ? sections : [{ title: 'Document', rawText: content.trim() }];
}
