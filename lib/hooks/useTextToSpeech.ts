'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return (
    voices.find((v) => v.lang.startsWith('en') && /female|samantha|zira|google us/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith('en')) ||
    voices[0]
  );
}

export function useTextToSpeech() {
  // Same reasoning as useSpeechToText: default to false so server and first
  // client render agree, then flip to the real value once mounted.
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    setSupported(isSupported);
    if (!isSupported) return;

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string): Promise<void> => {
      if (!supported || !text.trim()) return Promise.resolve();

      return new Promise((resolve) => {
        window.speechSynthesis.cancel(); // clear any queued/interrupted speech first

        const utterance = new SpeechSynthesisUtterance(text);
        const voice = pickVoice(voicesRef.current);
        if (voice) utterance.voice = voice;
        utterance.rate = 1;
        utterance.pitch = 1;

        utterance.onstart = () => setSpeaking(true);
        const finish = () => {
          setSpeaking(false);
          resolve();
        };
        utterance.onend = finish;
        utterance.onerror = finish;

        window.speechSynthesis.speak(utterance);
      });
    },
    [supported]
  );

  return { supported, speaking, speak, cancel };
}
