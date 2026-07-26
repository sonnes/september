import { recordApiCall } from '@/packages/usage';

/**
 * Metering for text-to-speech, shared by the buffered and streaming paths so
 * both record the same thing. Speech providers bill on characters sent, which
 * the caller always knows — no provider response is needed.
 */

/** Defaults mirror what each speech provider actually sends when unset. */
const DEFAULT_MODELS: Record<string, string> = {
  elevenlabs: 'eleven_flash_v2_5',
  gemini: 'gemini-2.5-flash-preview-tts',
  kokoro: 'kokoro-82m-v1.0',
  browser: 'system',
};

/** The model id to record for a speech call. */
export function speechModelId(provider: string, settings?: Record<string, unknown>): string {
  const configured = settings?.model_id;
  if (typeof configured === 'string' && configured) return configured;

  return DEFAULT_MODELS[provider] ?? 'unknown';
}

export interface SpeechCall {
  provider: string;
  model: string;
  voiceId?: string;
  text: string;
}

/**
 * Record a speech call once it settles, without changing what the caller sees:
 * the original promise is returned, so rejections still reach the fallback
 * paths that handle them.
 */
export function meterSpeech<T>(
  userId: string | undefined,
  call: SpeechCall,
  promise: Promise<T>
): Promise<T> {
  if (!userId) return promise;

  const startedAt = performance.now();

  const record = (success: boolean, error?: unknown) =>
    recordApiCall(userId, {
      kind: 'speech',
      provider: call.provider,
      model: call.model,
      voice_id: call.voiceId,
      characters: call.text.length,
      latency_ms: Math.round(performance.now() - startedAt),
      success,
      error_message: error
        ? error instanceof Error
          ? error.message
          : String(error)
        : undefined,
    });

  promise.then(
    () => record(true),
    error => record(false, error)
  );

  return promise;
}
