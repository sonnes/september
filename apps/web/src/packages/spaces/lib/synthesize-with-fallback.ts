import type { SpeechResponse } from '@/packages/speech';

/**
 * Resolve speech for a message, preferring the low-latency streaming path and
 * falling back to the buffered REST call when streaming is unavailable or
 * fails. `playedLive` tells the caller whether audio already played during
 * streaming (so it should not enqueue the blob again).
 */
export async function synthesizeWithFallback(
  streaming: Promise<SpeechResponse | undefined> | undefined,
  rest: () => Promise<SpeechResponse | undefined> | undefined
): Promise<{ speech: SpeechResponse | undefined; playedLive: boolean }> {
  if (streaming) {
    try {
      return { speech: await streaming, playedLive: true };
    } catch {
      // WS failed mid-flight — fall back to REST.
    }
  }
  return { speech: await rest(), playedLive: false };
}
