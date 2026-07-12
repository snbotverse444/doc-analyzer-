'use client';

import styles from './VoiceBar.module.css';

export type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

export default function VoiceBar({
  supported,
  status,
  interim,
  continuousMode,
  muted,
  onMicClick,
  onToggleContinuousMode,
  onToggleMuted
}: {
  supported: boolean;
  status: VoiceStatus;
  interim: string;
  continuousMode: boolean;
  muted: boolean;
  onMicClick: () => void;
  onToggleContinuousMode: () => void;
  onToggleMuted: () => void;
}) {
  if (!supported) {
    return (
      <div className={styles.bar}>
        <span className={styles.statusText}>Voice input isn&apos;t supported in this browser</span>
      </div>
    );
  }

  const statusText =
    status === 'listening'
      ? interim
        ? `Hearing: “${interim}”`
        : 'Listening…'
      : status === 'thinking'
      ? 'Thinking…'
      : status === 'speaking'
      ? 'Speaking…'
      : continuousMode
      ? 'Voice mode on'
      : '';

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={`${styles.iconButton} ${status === 'listening' ? styles.micActive : ''}`}
        onClick={onMicClick}
        disabled={continuousMode}
        title={continuousMode ? 'Turn off voice mode to dictate manually' : 'Speak your question'}
        aria-label="Dictate a message"
      >
        {status === 'listening' ? '●' : '🎤'}
      </button>

      <button
        type="button"
        className={`${styles.toggleButton} ${continuousMode ? styles.toggleButtonOn : ''}`}
        onClick={onToggleContinuousMode}
        title="Hands-free continuous voice conversation"
      >
        <span className={`${styles.toggleDot} ${continuousMode ? styles.toggleDotOn : ''}`} />
        Voice mode
      </button>

      <button
        type="button"
        className={styles.iconButton}
        onClick={onToggleMuted}
        title={muted ? 'Unmute spoken responses' : 'Mute spoken responses'}
        aria-label="Toggle spoken responses"
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {statusText && <span className={styles.statusText}>{statusText}</span>}
    </div>
  );
}
