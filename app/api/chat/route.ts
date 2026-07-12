import { NextRequest, NextResponse } from 'next/server';
import { chatWithContext } from '@/lib/groq';
import type { ChatMessage, DocumentContext } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const context: DocumentContext | undefined = body?.context;
    const history: ChatMessage[] = body?.history || [];

    if (!context) {
      return NextResponse.json(
        { error: 'No document context available. Please upload a document first.' },
        { status: 400 }
      );
    }

    if (!history.length) {
      return NextResponse.json({ error: 'No message provided.' }, { status: 400 });
    }

    const reply = await chatWithContext({ context, history });

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error('chat error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to generate a response.' },
      { status: 500 }
    );
  }
}
