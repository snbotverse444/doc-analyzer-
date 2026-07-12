'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

function getRecognitionCtor(): { new (): SpeechRecognition } | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * Wraps the browser's SpeechRecognition API into a single "listen for one
 * utterance" call. The browser itself detects when the user stops talking
 * (a short trailing silence) and finalizes the transcript, so callers get a
 * natural turn-taking experience without managing silence-detection timers.
 */
export function useSpeechToText() {
  // Start as `false` on both server and the first client render so hydration
  // has matching markup; the real capability is detected right after mount
  // (browser-only APIs like SpeechRecognition don't exist during SSR).
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const stoppedManuallyRef = useRef(false);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const stop = useCallback(() => {
    stoppedManuallyRef.current = true;
    recognitionRef.current?.stop();
  }, []);

  /**
   * Starts listening for a single utterance. Resolves with the recognized
   * text, or '' if nothing was recognized, the user cancelled, or the
   * browser reported an error (e.g. no microphone permission).
   */
  const listenOnce = useCallback((): Promise<string> => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return Promise.resolve('');

    return new Promise((resolve) => {
      const recognition = new Ctor();
      recognitionRef.current = recognition;
      stoppedManuallyRef.current = false;

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let finalTranscript = '';
      let settled = false;

      const finish = (value: string) => {
        if (settled) return;
        settled = true;
        setListening(false);
        setInterim('');
        resolve(value);
      };

      recognition.onstart = () => setListening(true);

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }
        setInterim(interimText);
      };

      recognition.onerror = () => {
        finish(finalTranscript.trim());
      };

      recognition.onend = () => {
        finish(finalTranscript.trim());
      };

      try {
        recognition.start();
      } catch {
        finish('');
      }
    });
  }, []);

  return { supported, listening, interim, listenOnce, stop };
}
