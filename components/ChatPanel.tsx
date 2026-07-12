'use client';

import { useEffect, useRef } from 'react';
import styles from './ChatPanel.module.css';
import MessageBubble from './MessageBubble';
import UploadZone from './UploadZone';
import VoiceBar, { VoiceStatus } from './VoiceBar';
import type { ChatMessage, DocumentContext, PipelineStage } from '@/lib/types';

function statusInfo(stage: PipelineStage) {
  switch (stage) {
    case 'ready':
      return { label: 'Context ready', dotClass: 'ready' };
    case 'uploading':
      return { label: 'Uploading…', dotClass: 'busy' };
    case 'parsing':
      return { label: 'Parsing document…', dotClass: 'busy' };
    case 'structuring':
      return { label: 'Building context…', dotClass: 'busy' };
    case 'error':
      return { label: 'Something went wrong', dotClass: 'waiting' };
    default:
      return { label: 'Awaiting document', dotClass: 'waiting' };
  }
}

export default function ChatPanel({
  messages,
  stage,
  context,
  isSending,
  uploadError,
  onSend,
  onFileSelected,
  draft,
  onDraftChange,
  voiceSupported,
  voiceStatus,
  voiceInterim,
  continuousVoiceMode,
  voiceMuted,
  onMicClick,
  onToggleContinuousMode,
  onToggleVoiceMuted
}: {
  messages: ChatMessage[];
  stage: PipelineStage;
  context: DocumentContext | null;
  isSending: boolean;
  uploadError: string | null;
  onSend: (text: string) => void;
  onFileSelected: (file: File) => void;
  draft: string;
  onDraftChange: (value: string) => void;
  voiceSupported: boolean;
  voiceStatus: VoiceStatus;
  voiceInterim: string;
  continuousVoiceMode: boolean;
  voiceMuted: boolean;
  onMicClick: () => void;
  onToggleContinuousMode: () => void;
  onToggleVoiceMuted: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isProcessing = stage === 'uploading' || stage === 'parsing' || stage === 'structuring';
  const status = statusInfo(stage);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    onDraftChange('');
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          {context ? `Chatting about “${context.fileName}”` : 'Doc Analyzer Assistant'}
        </div>
        <div className={styles.statusBadge}>
          <span
            className={`${styles.statusDot} ${
              status.dotClass === 'ready'
                ? styles.statusDotReady
                : status.dotClass === 'busy'
                ? styles.statusDotBusy
                : styles.statusDotWaiting
            }`}
          />
          {status.label}
        </div>
      </div>

      <div className={styles.messages} ref={scrollRef}>
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {!context && (
          <div className={styles.uploadSlot}>
            <UploadZone
              onFileSelected={onFileSelected}
              disabled={isProcessing}
              error={uploadError}
            />
          </div>
        )}

        {isSending && (
          <div className={styles.row}>
            <div className={styles.typing}>
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </div>
          </div>
        )}
      </div>

      <div className={styles.voiceRow}>
        <VoiceBar
          supported={voiceSupported}
          status={voiceStatus}
          interim={voiceInterim}
          continuousMode={continuousVoiceMode}
          muted={voiceMuted}
          onMicClick={onMicClick}
          onToggleContinuousMode={onToggleContinuousMode}
          onToggleMuted={onToggleVoiceMuted}
        />
      </div>

      <div className={styles.composer}>
        <textarea
          className={styles.input}
          rows={1}
          placeholder={
            continuousVoiceMode
              ? 'Voice mode is on — just speak…'
              : context
              ? 'Ask a question about your document…'
              : 'Upload a document to get started…'
          }
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          disabled={continuousVoiceMode}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!draft.trim() || continuousVoiceMode}
        >
          Send
        </button>
      </div>
    </div>
  );
}
