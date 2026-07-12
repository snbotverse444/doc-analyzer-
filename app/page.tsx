'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './page.module.css';
import PipelineRail from '@/components/PipelineRail';
import ChatPanel from '@/components/ChatPanel';
import { useSpeechToText } from '@/lib/hooks/useSpeechToText';
import { useTextToSpeech } from '@/lib/hooks/useTextToSpeech';
import type { ChatMessage, DocumentContext, PipelineStage } from '@/lib/types';

const STORAGE_KEY = 'docmind_context_v1';

const WELCOME_TEXT =
  "Hi, I'm Doc Analyzer. Upload a spreadsheet, Word document, PowerPoint deck, or text file below, " +
  "and I'll read through it, understand its structure (including any diagrams), and get ready to " +
  'answer your questions about it.';

const REMINDER_VARIANTS = [
  "I don't have a document to work from yet — upload one below and I'll get to work.",
  'Just a reminder: I need a document uploaded before I can answer that. Drop a file in below.',
  "I can't help with that until there's a document loaded. Please upload one of the supported files first."
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function makeMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return { id: makeId(), role, content, createdAt: new Date().toISOString() };
}

export default function Home() {
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [context, setContext] = useState<DocumentContext | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [continuousVoiceMode, setContinuousVoiceMode] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);

  const reminderIndex = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const contextRef = useRef<DocumentContext | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const continuousModeRef = useRef(false);
  const mutedRef = useRef(false);
  const voiceRunIdRef = useRef(0);

  const stt = useSpeechToText();
  const tts = useTextToSpeech();

  useEffect(() => {
    contextRef.current = context;
  }, [context]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    continuousModeRef.current = continuousVoiceMode;
  }, [continuousVoiceMode]);
  useEffect(() => {
    mutedRef.current = voiceMuted;
  }, [voiceMuted]);

  // Load any previously generated context from this browser on first mount.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: DocumentContext = JSON.parse(stored);
        setContext(parsed);
        setStage('ready');
        setMessages([
          makeMessage('assistant', WELCOME_TEXT),
          makeMessage(
            'assistant',
            `Welcome back — I still have context loaded from "${parsed.fileName}". Ask away, or clear the context to start over.`
          )
        ]);
        return;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setMessages([
      makeMessage('assistant', WELCOME_TEXT),
      makeMessage('assistant', REMINDER_VARIANTS[0])
    ]);
  }, []);

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      stt.stop();
      tts.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelected = async (file: File) => {
    setUploadError(null);
    setStage('uploading');
    timers.current.forEach(clearTimeout);
    timers.current = [
      setTimeout(() => setStage('parsing'), 500),
      setTimeout(() => setStage('structuring'), 1600)
    ];

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/process-document', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process the document.');
      }

      timers.current.forEach(clearTimeout);
      const newContext: DocumentContext = data.context;
      setContext(newContext);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newContext));
      setStage('ready');
      setMessages((prev) => [
        ...prev,
        makeMessage(
          'assistant',
          `Context is ready. Here's what I found in "${newContext.fileName}":\n\n${newContext.overallSummary}\n\nAsk me anything about it.`
        )
      ]);
    } catch (err: any) {
      timers.current.forEach(clearTimeout);
      setStage('idle');
      setUploadError(err?.message || 'Something went wrong while processing the file.');
    }
  };

  /**
   * Sends a message (typed or dictated) and returns the assistant's reply text,
   * or null if no reply was actually generated (e.g. just a "please upload" nudge
   * that isn't worth speaking aloud twice, or an empty utterance).
   */
  const sendMessage = async (text: string): Promise<string | null> => {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const userMessage = makeMessage('user', trimmed);
    setMessages((prev) => [...prev, userMessage]);

    if (!contextRef.current) {
      const reminder = REMINDER_VARIANTS[reminderIndex.current % REMINDER_VARIANTS.length];
      reminderIndex.current += 1;
      setMessages((prev) => [...prev, makeMessage('assistant', reminder)]);
      return reminder;
    }

    setIsSending(true);
    try {
      const history = [...messagesRef.current, userMessage].slice(-16);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: contextRef.current, history })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get a response.');
      }

      setMessages((prev) => [...prev, makeMessage('assistant', data.reply)]);
      return data.reply as string;
    } catch (err: any) {
      const errorText = `Sorry, something went wrong: ${err?.message || 'unknown error'}`;
      setMessages((prev) => [...prev, makeMessage('assistant', errorText)]);
      return errorText;
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = (text: string) => {
    void sendMessage(text);
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setContext(null);
    setStage('idle');
    setUploadError(null);
    reminderIndex.current = 0;
    setMessages([
      makeMessage('assistant', 'Context cleared. Upload a new document whenever you’re ready.'),
      makeMessage('assistant', REMINDER_VARIANTS[0])
    ]);
  };

  // --- Voice: single-shot dictation into the text box ---
  const handleMicClick = async () => {
    if (stt.listening) {
      stt.stop();
      return;
    }
    tts.cancel();
    const transcript = await stt.listenOnce();
    if (transcript) setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript));
  };

  // --- Voice: hands-free continuous conversation loop ---
  useEffect(() => {
    if (!continuousVoiceMode) return;

    const runId = ++voiceRunIdRef.current;
    let cancelled = false;

    const loop = async () => {
      while (!cancelled && continuousModeRef.current && voiceRunIdRef.current === runId) {
        const transcript = await stt.listenOnce();
        if (cancelled || !continuousModeRef.current || voiceRunIdRef.current !== runId) break;

        if (!transcript) continue; // nothing heard, just keep listening

        const reply = await sendMessage(transcript);
        if (cancelled || !continuousModeRef.current || voiceRunIdRef.current !== runId) break;

        if (reply && !mutedRef.current) {
          await tts.speak(reply);
        }
      }
    };

    void loop();

    return () => {
      cancelled = true;
      stt.stop();
      tts.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuousVoiceMode]);

  const handleToggleContinuousMode = () => {
    setContinuousVoiceMode((prev) => {
      const next = !prev;
      if (!next) {
        stt.stop();
        tts.cancel();
      }
      return next;
    });
  };

  const voiceStatus = tts.speaking
    ? 'speaking'
    : stt.listening
    ? 'listening'
    : isSending
    ? 'thinking'
    : 'idle';

  return (
    <div className={styles.shell}>
      <PipelineRail stage={stage} context={context} onClear={handleClear} />
      <ChatPanel
        messages={messages}
        stage={stage}
        context={context}
        isSending={isSending}
        uploadError={uploadError}
        onSend={handleSend}
        onFileSelected={handleFileSelected}
        draft={draft}
        onDraftChange={setDraft}
        voiceSupported={stt.supported && tts.supported}
        voiceStatus={voiceStatus}
        voiceInterim={stt.interim}
        continuousVoiceMode={continuousVoiceMode}
        voiceMuted={voiceMuted}
        onMicClick={handleMicClick}
        onToggleContinuousMode={handleToggleContinuousMode}
        onToggleVoiceMuted={() => setVoiceMuted((m) => !m)}
      />
    </div>
  );
}
