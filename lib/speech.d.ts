export {};

declare global {
  interface SpeechRecognitionEventResultItem {
    transcript: string;
    confidence: number;
  }

  interface SpeechRecognitionResultLike {
    isFinal: boolean;
    length: number;
    [index: number]: SpeechRecognitionEventResultItem;
  }

  interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: {
      length: number;
      [index: number]: SpeechRecognitionResultLike;
    };
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  }

  interface Window {
    SpeechRecognition?: { new (): SpeechRecognition };
    webkitSpeechRecognition?: { new (): SpeechRecognition };
  }
}
