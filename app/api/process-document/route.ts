import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { detectFileType, parseDocument } from '@/lib/parsers';
import { describeImage, summarizeOverall, summarizeSection } from '@/lib/groq';
import type { DiagramNote, DocumentContext, SectionContext } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file was provided.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: 'File is too large. Please upload a file under 20MB.' },
        { status: 400 }
      );
    }

    const fileType = detectFileType(file.name);
    if (!fileType) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload .xlsx, .xls, .docx, .pptx, or .txt.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { sections: rawSections, images: rawImages } = await parseDocument(buffer, fileType);

    if (rawSections.length === 0) {
      return NextResponse.json(
        { error: 'No readable content was found in this file.' },
        { status: 422 }
      );
    }

    // 1. Summarize each section/sheet/slide with the LLM.
    const sections: SectionContext[] = await Promise.all(
      rawSections.map(async (s) => {
        const summary = await summarizeSection({
          title: s.title,
          rawText: s.rawText,
          fileType
        });
        return {
          id: uuidv4(),
          title: s.title,
          summary,
          rawExcerpt: s.rawText.slice(0, 500)
        };
      })
    );

    // 2. Describe any embedded diagrams/images with a vision model (best effort).
    const diagramResults = await Promise.all(
      rawImages.map(async (img) => {
        const description = await describeImage({
          base64Image: img.base64,
          mimeType: img.mimeType,
          location: img.location
        });
        return description ? ({ location: img.location, description } as DiagramNote) : null;
      })
    );
    const diagrams = diagramResults.filter((d): d is DiagramNote => d !== null);

    // 3. Build one overall executive summary tying everything together.
    const overallSummary = await summarizeOverall({
      fileName: file.name,
      fileType,
      sections,
      diagrams
    });

    const context: DocumentContext = {
      fileName: file.name,
      fileType,
      generatedAt: new Date().toISOString(),
      sections,
      diagrams,
      overallSummary
    };

    return NextResponse.json({ context });
  } catch (err: any) {
    console.error('process-document error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process the document.' },
      { status: 500 }
    );
  }
}
