'use client';

import styles from './MessageBubble.module.css';
import voiceStyles from './VoiceBar.module.css';
import { useTextToSpeech } from '@/lib/hooks/useTextToSpeech';
import type { ChatMessage } from '@/lib/types';

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const { supported, speaking, speak, cancel } = useTextToSpeech();

  return (
    <div className={`${styles.row} ${isUser ? styles.rowUser : styles.rowAssistant}`}>
      <div>
        <div
          className={`${styles.bubble} ${
            isSystem ? styles.bubbleSystem : isUser ? styles.bubbleUser : styles.bubbleAssistant
          }`}
        >
          {message.content}
        </div>
        {!isUser && supported && (
          <button
            type="button"
            className={`${voiceStyles.speakButton} ${speaking ? voiceStyles.speakButtonActive : ''}`}
            onClick={() => (speaking ? cancel() : speak(message.content))}
          >
            {speaking ? '■ Stop' : '▶ Play'}
          </button>
        )}
      </div>
    </div>
  );
}
