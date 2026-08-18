'use client';

import { useCallback, useState } from 'react';

import { useAccount } from '@/packages/account';
import { recordApiCall } from '@/packages/usage';

import { useAISettings } from './use-ai-settings';
import { useGenerate } from './use-generate';

const TRANSCRIPTION_PROMPT = `You are a speech-to-text transcription service.

Transcribe the provided audio exactly as spoken, including filler words (um, uh, like).
Use natural punctuation. If there is no discernible speech, return an empty string.
Return only the transcribed text — no commentary, no formatting.`;

/** Matches the whisper entry in the provider registry. */
const WHISPER_MODEL = 'onnx-community/whisper-base';

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
  const { user } = useAccount();
  const isLocal = transcriptionConfig.provider === 'whisper';
  const localModel = transcriptionConfig.model ?? WHISPER_MODEL;
  const { generate, isGenerating, isReady } = useGenerate({
    provider: transcriptionConfig.provider,
    model: transcriptionConfig.model,
  });
  const [isTranscribing, setIsTranscribing] = useState(false);

  // The cloud path is metered by the generation middleware; the local one has
  // no model call to wrap, so it records itself — a run that cost nothing is
  // still worth showing.
  const transcribeOnDevice = useCallback(
    async (audio: Blob): Promise<string> => {
      if (import.meta.env.MODE === 'tauri') {
        throw new Error('Browser-local Whisper is unavailable in the desktop app.');
      }
      // Lazy import keeps the transformers runtime out of initial bundles.
      const { transcribeLocally } = await import('@/packages/ai/lib/whisper-runtime');
      const startedAt = performance.now();

      try {
        const { text, audio_seconds } = await transcribeLocally(audio);

        if (user?.id) {
          recordApiCall(user.id, {
            kind: 'llm',
            provider: 'whisper',
            model: localModel,
            feature: 'transcription',
            audio_seconds,
            output_length: text.length,
            latency_ms: Math.round(performance.now() - startedAt),
            success: true,
          });
        }

        return text.trim();
      } catch (error) {
        if (user?.id) {
          recordApiCall(user.id, {
            kind: 'llm',
            provider: 'whisper',
            model: localModel,
            feature: 'transcription',
            latency_ms: Math.round(performance.now() - startedAt),
            success: false,
            error_message: error instanceof Error ? error.message : String(error),
          });
        }

        throw error;
      }
    },
    [localModel, user?.id]
  );

  const transcribe = useCallback(
    async (audio: Blob): Promise<string | undefined> => {
      setIsTranscribing(true);
      try {
        if (isLocal) return await transcribeOnDevice(audio);

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
    [generate, isLocal, transcribeOnDevice]
  );

  return {
    transcribe,
    isTranscribing: isTranscribing || isGenerating,
    isReady: isLocal || isReady,
  };
}
