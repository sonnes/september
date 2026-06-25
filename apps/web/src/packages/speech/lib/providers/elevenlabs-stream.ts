import { pcmToWavDataUri } from '@/packages/audio';
import type { Alignment } from '@/packages/audio';

import type { SpeechResponse, SpeechStreamHooks } from '../../types';

export type { SpeechStreamHooks };

/** Per-chunk alignment as delivered by the ElevenLabs stream-input WebSocket. */
export interface WsAlignment {
  chars: string[];
  charStartTimesMs: number[];
  charDurationsMs: number[];
}

export interface StreamSpeechOptions {
  text: string;
  previousText?: string;
  apiKey: string;
  /** Empty/omitted for models that don't take voice settings (e.g. eleven_v3). */
  voiceSettings?: Record<string, unknown>;
  sampleRate: number;
  chunkLengthSchedule?: number[];
  /** Reject if no audio arrives within this window (drives the REST fallback). */
  firstChunkTimeoutMs?: number;
}

/** Decode base64 little-endian 16-bit PCM into an Int16Array. */
export function base64ToInt16(b64: string): Int16Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const usableBytes = bytes.length - (bytes.length % 2);
  return new Int16Array(bytes.buffer, 0, usableBytes / 2);
}

/**
 * Merge the per-chunk alignments from a stream into the app's `Alignment`,
 * converting ms→seconds and offsetting each chunk by the cumulative audio
 * duration that preceded it (stream-input timestamps are chunk-relative).
 */
export function mergeStreamAlignment(
  parts: { alignment: WsAlignment; offsetMs: number }[]
): Alignment {
  const characters: string[] = [];
  const start_times: number[] = [];
  const end_times: number[] = [];

  for (const { alignment, offsetMs } of parts) {
    const { chars, charStartTimesMs, charDurationsMs } = alignment;
    for (let i = 0; i < chars.length; i++) {
      const start = charStartTimesMs[i] + offsetMs;
      characters.push(chars[i]);
      start_times.push(start / 1000);
      end_times.push((start + charDurationsMs[i]) / 1000);
    }
  }

  return { characters, start_times, end_times };
}

/**
 * Drive one utterance over an already-open stream-input WebSocket: send the
 * BOS/text/EOS sequence, stream decoded PCM chunks to `hooks`, and resolve with
 * the assembled WAV blob + merged alignment once the server signals `isFinal`.
 *
 * Rejects on socket error, premature close before any audio, or first-chunk
 * timeout — the caller treats any rejection as a cue to fall back to REST.
 */
export function streamElevenLabsSpeech(
  socket: WebSocket,
  opts: StreamSpeechOptions,
  hooks: SpeechStreamHooks
): Promise<SpeechResponse> {
  return new Promise((resolve, reject) => {
    const chunks: Int16Array[] = [];
    const alignmentParts: { alignment: WsAlignment; offsetMs: number }[] = [];
    let accumulatedMs = 0;
    let gotChunk = false;
    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      socket.removeEventListener('error', onError);
      socket.removeEventListener('close', onClose);
    };

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const resolveNow = () =>
      settle(() =>
        resolve({
          blob: chunks.length ? pcmToWavDataUri(chunks, opts.sampleRate) : undefined,
          alignment: alignmentParts.length ? mergeStreamAlignment(alignmentParts) : undefined,
        })
      );

    const onMessage = (ev: MessageEvent) => {
      let data: { audio?: string; alignment?: WsAlignment; isFinal?: boolean };
      try {
        data = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
      } catch {
        return;
      }

      if (data.audio) {
        const int16 = base64ToInt16(data.audio);
        if (int16.length) {
          if (!gotChunk) {
            gotChunk = true;
            clearTimeout(timer);
            hooks.onStart?.();
          }
          if (data.alignment) alignmentParts.push({ alignment: data.alignment, offsetMs: accumulatedMs });
          chunks.push(int16);
          hooks.onAudioChunk(int16);
          accumulatedMs += (int16.length / opts.sampleRate) * 1000;
        }
      } else if (data.alignment) {
        alignmentParts.push({ alignment: data.alignment, offsetMs: accumulatedMs });
      }

      if (data.isFinal) resolveNow();
    };

    const onError = () => settle(() => reject(new Error('ElevenLabs WS error')));
    const onClose = () =>
      gotChunk ? resolveNow() : settle(() => reject(new Error('WS closed before audio')));

    const timer = setTimeout(
      () => settle(() => reject(new Error('No audio chunk from ElevenLabs WS'))),
      opts.firstChunkTimeoutMs ?? 6000
    );

    socket.addEventListener('message', onMessage);
    socket.addEventListener('error', onError);
    socket.addEventListener('close', onClose);

    socket.send(
      JSON.stringify({
        text: ' ',
        voice_settings: opts.voiceSettings,
        'xi-api-key': opts.apiKey,
        ...(opts.previousText ? { previous_text: opts.previousText } : {}),
        ...(opts.chunkLengthSchedule
          ? { generation_config: { chunk_length_schedule: opts.chunkLengthSchedule } }
          : {}),
      })
    );
    socket.send(JSON.stringify({ text: `${opts.text.trim()} ` }));
    socket.send(JSON.stringify({ text: '' }));
  });
}
