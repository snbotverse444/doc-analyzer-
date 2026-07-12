import Groq from 'groq-sdk';
import type { ChatMessage, DiagramNote, DocumentContext, SectionContext } from './types';

const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile';
const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'llama-3.2-11b-vision-preview';

function getClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY is not set. Add it to your .env.local file (see .env.example).'
    );
  }
  return new Groq({ apiKey });
}

/**
 * Turns a raw chunk of extracted text (one sheet / one heading section / one slide)
 * into a compact, structured summary that is cheap to keep in context long-term.
 */
export async function summarizeSection(params: {
  title: string;
  rawText: string;
  fileType: string;
}): Promise<string> {
  const groq = getClient();
  const { title, rawText, fileType } = params;

  const truncated = rawText.slice(0, 12000); // keep prompt bounded

  const completion = await groq.chat.completions.create({
    model: TEXT_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'You are a document-analysis engine. You read raw extracted content from one section of a ' +
          `${fileType.toUpperCase()} file and produce a dense, factual, well-structured summary that will ` +
          'later be used as grounding context for answering user questions. ' +
          'Preserve concrete facts, numbers, names, and relationships. Do not add commentary or opinions. ' +
          'Output plain text (no markdown headers), organized as short bullet-like lines.'
      },
      {
        role: 'user',
        content: `Section title: ${title}\n\nRaw content:\n${truncated}`
      }
    ]
  });

  return completion.choices[0]?.message?.content?.trim() || '';
}

/**
 * Produces one final overall summary that ties all section summaries together.
 */
export async function summarizeOverall(params: {
  fileName: string;
  fileType: string;
  sections: SectionContext[];
  diagrams: DiagramNote[];
}): Promise<string> {
  const groq = getClient();
  const { fileName, fileType, sections, diagrams } = params;

  const sectionBlock = sections
    .map((s) => `### ${s.title}\n${s.summary}`)
    .join('\n\n');
  const diagramBlock = diagrams.length
    ? diagrams.map((d) => `- (${d.location}) ${d.description}`).join('\n')
    : 'None detected.';

  const completion = await groq.chat.completions.create({
    model: TEXT_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'You write a short (5-8 sentence) executive overview of a document, given per-section summaries ' +
          'and notes about any diagrams found. This overview will be shown to a user as confirmation that ' +
          'the system understood their document. Be specific about what the document actually contains.'
      },
      {
        role: 'user',
        content: `File: ${fileName} (${fileType})\n\nSection summaries:\n${sectionBlock}\n\nDiagrams found:\n${diagramBlock}`
      }
    ]
  });

  return completion.choices[0]?.message?.content?.trim() || '';
}

/**
 * Describes an embedded image using a Groq vision-capable model. Used to "wisely handle"
 * diagrams/architecture images found inside docx/pptx files.
 */
export async function describeImage(params: {
  base64Image: string;
  mimeType: string;
  location: string;
}): Promise<string | null> {
  try {
    const groq = getClient();
    const { base64Image, mimeType, location } = params;

    const completion = await groq.chat.completions.create({
      model: VISION_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `This image was extracted from "${location}" of a document. ` +
                'If it is a diagram, flowchart, architecture diagram, or chart, describe its structure, ' +
                'components, and relationships precisely, so the description can substitute for the image ' +
                'in a text-only knowledge base. If it is a decorative image/logo/photo with no informational ' +
                'value, reply with exactly: NOT_INFORMATIONAL.'
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` }
            }
          ] as any
        }
      ]
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text || text === 'NOT_INFORMATIONAL') return null;
    return text;
  } catch (err) {
    // Vision model may be unavailable/rate-limited; don't fail the whole pipeline over one image.
    console.error('describeImage failed:', err);
    return null;
  }
}

function buildSystemPromptFromContext(context: DocumentContext): string {
  const sectionBlock = context.sections
    .map((s) => `## ${s.title}\n${s.summary}`)
    .join('\n\n');
  const diagramBlock = context.diagrams.length
    ? context.diagrams.map((d) => `- (${d.location}) ${d.description}`).join('\n')
    : 'None.';

  return (
    'You are a helpful assistant answering questions strictly grounded in the document context below. ' +
    "The context was generated from the user's uploaded file: " +
    `"${context.fileName}" (${context.fileType}).\n\n` +
    `OVERALL SUMMARY:\n${context.overallSummary}\n\n` +
    `SECTION DETAILS:\n${sectionBlock}\n\n` +
    `DIAGRAMS / VISUALS FOUND IN THE DOCUMENT:\n${diagramBlock}\n\n` +
    'Rules:\n' +
    '- Answer only using the information above.\n' +
    "- If the answer is not present in the context, say so clearly and do not fabricate details.\n" +
    '- Be concise and precise. Cite the relevant section/sheet/slide name when helpful.'
  );
}

export async function chatWithContext(params: {
  context: DocumentContext;
  history: ChatMessage[];
}): Promise<string> {
  const groq = getClient();
  const { context, history } = params;

  const systemPrompt = buildSystemPromptFromContext(context);

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }))
  ];

  const completion = await groq.chat.completions.create({
    model: TEXT_MODEL,
    temperature: 0.3,
    messages
  });

  return completion.choices[0]?.message?.content?.trim() || "I couldn't generate a response.";
}
