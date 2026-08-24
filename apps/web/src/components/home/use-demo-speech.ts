'use client';

import { useCallback, useEffect, useRef } from 'react';

export interface DemoVoice {
  id: string;
  name: string;
  language: string;
}

export interface DemoSequenceHooks {
  onPart?: (index: number) => void;
  onDone?: () => void;
}

export interface UseDemoSpeechReturn {
  /** Speak one message through the app's audio player (browser TTS). */
  speak: (text: string, voice?: DemoVoice) => void;
  /** Speak parts back-to-back, reporting each part as it starts. */
  speakSequence: (parts: string[], hooks?: DemoSequenceHooks, voice?: DemoVoice) => void;
  /** Cancel an in-flight speakSequence. */
  stopSequence: () => void;
  /** Device voices from the browser speech engine. */
  listVoices: () => Promise<DemoVoice[]>;
}

/**
 * The one speech seam shared by every landing-page prototype. Uses the real
 * browser speech engine, so the demos work before setup and keep no page data.
 */
export function useDemoSpeech(): UseDemoSpeechReturn {
  const sequenceId = useRef(0);

  const utterance = useCallback((text: string, voice?: DemoVoice) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const spoken = new SpeechSynthesisUtterance(text);
    spoken.rate = 1;
    spoken.pitch = 1;
    spoken.volume = 1;
    spoken.lang = voice?.language ?? 'en-US';
    if (voice) {
      spoken.voice =
        window.speechSynthesis
          .getVoices()
          .find(candidate => candidate.voiceURI === voice.id || candidate.name === voice.name) ??
        null;
    }
    return spoken;
  }, []);

  const speak = useCallback((text: string, voice?: DemoVoice) => {
    const spoken = utterance(text, voice);
    if (!spoken) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(spoken);
  }, [utterance]);

  const speakSequence = useCallback(
    (parts: string[], hooks?: DemoSequenceHooks, voice?: DemoVoice) => {
      const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
      const id = ++sequenceId.current;

      const speakPart = async (index: number) => {
        if (id !== sequenceId.current) return;
        if (index >= parts.length) {
          hooks?.onDone?.();
          return;
        }
        hooks?.onPart?.(index);
        const spoken = utterance(parts[index], voice);
        if (!synthesis || !spoken) {
          // No speech support: advance on a reading-pace timer instead.
          setTimeout(() => speakPart(index + 1), 2200);
          return;
        }
        spoken.onend = () => speakPart(index + 1);
        spoken.onerror = () => speakPart(index + 1);
        synthesis.speak(spoken);
      };

      synthesis?.cancel();
      void speakPart(0);
    },
    [utterance]
  );

  const stopSequence = useCallback(() => {
    sequenceId.current++;
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => stopSequence, [stopSequence]);

  const listVoices = useCallback(async (): Promise<DemoVoice[]> => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    return window.speechSynthesis.getVoices().map(voice => ({
      id: voice.voiceURI,
      name: voice.name,
      language: voice.lang,
    }));
  }, []);

  return { speak, speakSequence, stopSequence, listVoices };
}
