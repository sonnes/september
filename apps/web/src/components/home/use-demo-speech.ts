'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useAudioPlayer } from '@/packages/audio';
import { useSpeechContext } from '@/packages/speech';
import type { Voice } from '@/packages/shared';

// Fixed, calm defaults for the marketing prototypes — the in-app experience
// reads these from the account's speech settings instead.
const DEMO_TTS_OPTIONS = { speed: 1, pitch: 1, volume: 1, language: 'en-US' };

export interface DemoSequenceHooks {
  onPart?: (index: number) => void;
  onDone?: () => void;
}

export interface UseDemoSpeechReturn {
  /** Speak one message through the app's audio player (browser TTS). */
  speak: (text: string, voice?: Voice) => void;
  /** Speak parts back-to-back, reporting each part as it starts. */
  speakSequence: (parts: string[], hooks?: DemoSequenceHooks, voice?: Voice) => void;
  /** Cancel an in-flight speakSequence. */
  stopSequence: () => void;
  /** Device voices from the browser speech engine. */
  listVoices: () => Promise<Voice[]>;
}

/**
 * The one speech seam shared by every landing-page prototype. Uses the real
 * speech stack — the browser engine from the speech registry, played through
 * the app's AudioPlayer — so the demos are the product, not a recording.
 */
export function useDemoSpeech(): UseDemoSpeechReturn {
  const { getProvider } = useSpeechContext();
  const { enqueue } = useAudioPlayer();
  const sequenceId = useRef(0);

  const speak = useCallback(
    (text: string, voice?: Voice) => {
      getProvider('browser')
        ?.generateSpeech({ text, voice, options: DEMO_TTS_OPTIONS })
        .then(response => {
          if (response.utterance) enqueue({ text, utterance: response.utterance });
        })
        .catch(() => {
          /* no speech support — the demo stays visual */
        });
    },
    [getProvider, enqueue]
  );

  const speakSequence = useCallback(
    (parts: string[], hooks?: DemoSequenceHooks, voice?: Voice) => {
      const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
      const id = ++sequenceId.current;

      const speakPart = async (index: number) => {
        if (id !== sequenceId.current) return;
        if (index >= parts.length) {
          hooks?.onDone?.();
          return;
        }
        hooks?.onPart?.(index);
        // Sentence-level onend callbacks need direct synthesis control; the
        // provider still builds the utterance so voice/settings stay real.
        const response = await getProvider('browser')
          ?.generateSpeech({ text: parts[index], voice, options: DEMO_TTS_OPTIONS })
          .catch(() => undefined);
        const utterance = response?.utterance;
        if (!synthesis || !utterance) {
          // No speech support: advance on a reading-pace timer instead.
          setTimeout(() => speakPart(index + 1), 2200);
          return;
        }
        utterance.onend = () => speakPart(index + 1);
        utterance.onerror = () => speakPart(index + 1);
        synthesis.speak(utterance);
      };

      synthesis?.cancel();
      void speakPart(0);
    },
    [getProvider]
  );

  const stopSequence = useCallback(() => {
    sequenceId.current++;
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => stopSequence, [stopSequence]);

  const listVoices = useCallback(async () => {
    try {
      return (await getProvider('browser')?.listVoices({ page: 1, limit: 100 })) ?? [];
    } catch {
      return [];
    }
  }, [getProvider]);

  return { speak, speakSequence, stopSequence, listVoices };
}
