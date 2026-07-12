'use client';

import { useCallback, useState } from 'react';

import { useAISettings } from './use-ai-settings';
import { useGenerate } from './use-generate';

const TRANSCRIPTION_PROMPT = `You are a speech-to-text transcription service.

Transcribe the provided audio exactly as spoken, including filler words (um, uh, like).
Use natural punctuation. If there is no discernible speech, return an empty string.
Return only the transcribed text — no commentary, no formatting.`;

export interface UseTranscribeReturn {
  /** Transcribe an audio blob to text using the configured provider + the user's key. */
  transcribe: (audio: Blob) => Promise<string | undefined>;
  /** Whether a transcription request is in flight. */
  isTranscribing: boolean;
  /** Whether the configured provider is ready (has an API key if required). */
  isReady: boolean;
}

/**
 * Transcribe audio with the account's transcription provider — Gemini or
 * OpenRouter client-side with the user's own API key (the same path as
 * suggestions), or the local `whisper` provider, which runs a Whisper model
 * in a Web Worker so audio never leaves the device.
 */
export function useTranscribe(): UseTranscribeReturn {
  const { transcriptionConfig } = useAISettings();
  const isLocal = transcriptionConfig.provider === 'whisper';
  const { generate, isGenerating, isReady } = useGenerate({
    provider: transcriptionConfig.provider,
    model: transcriptionConfig.model,
  });
  const [isTranscribing, setIsTranscribing] = useState(false);

  const transcribe = useCallback(
    async (audio: Blob): Promise<string | undefined> => {
      setIsTranscribing(true);
      try {
        if (isLocal) {
          // Lazy import keeps the transformers runtime out of initial bundles.
          const { transcribeLocally } = await import('../lib/whisper');
          return (await transcribeLocally(audio)).trim();
        }
        const bytes = new Uint8Array(await audio.arrayBuffer());
        const text = await generate({
          prompt: TRANSCRIPTION_PROMPT,
          audio: { data: bytes, mediaType: audio.type || 'audio/webm' },
          feature: 'transcription',
        });
        return text?.trim();
      } finally {
        setIsTranscribing(false);
      }
    },
    [generate, isLocal]
  );

  return {
    transcribe,
    isTranscribing: isTranscribing || isGenerating,
    isReady: isLocal || isReady,
  };
}
