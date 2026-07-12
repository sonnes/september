import { pcmToWavDataUri } from '@/packages/audio';
import { KokoroSpeechSettings } from '@/packages/shared';
import { Voice } from '@/packages/shared';

import {
  ListVoicesRequest,
  SpeechEngine,
  SpeechRequest,
  SpeechResponse,
  SpeechStreamHooks,
} from '../../types';
import { estimateAlignment, type KokoroAlignmentChunk } from './kokoro-alignment';
import { detectWebGpu, pickKokoroBackend } from './kokoro-backend';
import { setKokoroModelStatus } from './kokoro-status';

export const KOKORO_SAMPLE_RATE = 24000;
export const KOKORO_DEFAULT_VOICE = 'af_heart';

// Static voice catalog for the Kokoro-82M v1.0 model (kokoro-js voice list).
const KOKORO_VOICES: Voice[] = [
  // English US (20 voices)
  { id: 'af_heart', name: 'Heart', language: 'en-us', gender: 'Female' },
  { id: 'af_alloy', name: 'Alloy', language: 'en-us', gender: 'Female' },
  { id: 'af_aoede', name: 'Aoede', language: 'en-us', gender: 'Female' },
  { id: 'af_bella', name: 'Bella', language: 'en-us', gender: 'Female' },
  { id: 'af_jessica', name: 'Jessica', language: 'en-us', gender: 'Female' },
  { id: 'af_kore', name: 'Kore', language: 'en-us', gender: 'Female' },
  { id: 'af_nicole', name: 'Nicole', language: 'en-us', gender: 'Female' },
  { id: 'af_nova', name: 'Nova', language: 'en-us', gender: 'Female' },
  { id: 'af_river', name: 'River', language: 'en-us', gender: 'Female' },
  { id: 'af_sarah', name: 'Sarah', language: 'en-us', gender: 'Female' },
  { id: 'af_sky', name: 'Sky', language: 'en-us', gender: 'Female' },
  { id: 'am_adam', name: 'Adam', language: 'en-us', gender: 'Male' },
  { id: 'am_echo', name: 'Echo', language: 'en-us', gender: 'Male' },
  { id: 'am_eric', name: 'Eric', language: 'en-us', gender: 'Male' },
  { id: 'am_fenrir', name: 'Fenrir', language: 'en-us', gender: 'Male' },
  { id: 'am_liam', name: 'Liam', language: 'en-us', gender: 'Male' },
  { id: 'am_michael', name: 'Michael', language: 'en-us', gender: 'Male' },
  { id: 'am_onyx', name: 'Onyx', language: 'en-us', gender: 'Male' },
  { id: 'am_puck', name: 'Puck', language: 'en-us', gender: 'Male' },
  { id: 'am_santa', name: 'Santa', language: 'en-us', gender: 'Male' },

  // English GB (8 voices)
  { id: 'bf_emma', name: 'Emma', language: 'en-gb', gender: 'Female' },
  { id: 'bf_isabella', name: 'Isabella', language: 'en-gb', gender: 'Female' },
  { id: 'bf_alice', name: 'Alice', language: 'en-gb', gender: 'Female' },
  { id: 'bf_lily', name: 'Lily', language: 'en-gb', gender: 'Female' },
  { id: 'bm_george', name: 'George', language: 'en-gb', gender: 'Male' },
  { id: 'bm_lewis', name: 'Lewis', language: 'en-gb', gender: 'Male' },
  { id: 'bm_daniel', name: 'Daniel', language: 'en-gb', gender: 'Male' },
  { id: 'bm_fable', name: 'Fable', language: 'en-gb', gender: 'Male' },
];

export interface KokoroChunk {
  text: string;
  samples: Float32Array;
  sampleRate: number;
}

export interface KokoroGenerateRequest {
  text: string;
  voice: string;
  speed: number;
}

/**
 * Engine backing a `KokoroSpeechProvider`. The default is the worker-backed
 * singleton below; tests inject a fake.
 */
export interface KokoroEngineClient {
  load(): Promise<void>;
  generate(request: KokoroGenerateRequest, onChunk: (chunk: KokoroChunk) => void): Promise<void>;
}

interface PendingGeneration {
  onChunk: (chunk: KokoroChunk) => void;
  resolve: () => void;
  reject: (err: Error) => void;
}

/**
 * Talks to the Kokoro Web Worker. One worker/model for the whole app —
 * `useSpeech` recreates provider instances, so state here must not live on
 * the provider.
 */
class KokoroWorkerClient implements KokoroEngineClient {
  private worker: Worker | null = null;
  private loadPromise: Promise<void> | null = null;
  private loadWaiter: { resolve: () => void; reject: (err: Error) => void } | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingGeneration>();
  // Serialize generations — the ONNX session handles one stream at a time.
  private queue: Promise<void> = Promise.resolve();

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./kokoro-worker.ts', import.meta.url), {
        type: 'module',
      });
      this.worker.onmessage = event => this.handleMessage(event.data);
    }
    return this.worker;
  }

  private handleMessage(msg: {
    type: string;
    id?: number;
    progress?: number;
    device?: 'webgpu' | 'wasm';
    message?: string;
    text?: string;
    sampleRate?: number;
    samples?: Float32Array;
  }): void {
    switch (msg.type) {
      case 'load-progress':
        setKokoroModelStatus({ state: 'loading', progress: msg.progress ?? 0 });
        break;
      case 'ready':
        setKokoroModelStatus({ state: 'ready', device: msg.device ?? 'wasm' });
        this.loadWaiter?.resolve();
        this.loadWaiter = null;
        break;
      case 'load-error': {
        const err = new Error(msg.message ?? 'Failed to load the Kokoro model');
        setKokoroModelStatus({ state: 'error', message: err.message });
        this.loadPromise = null; // allow retry
        this.loadWaiter?.reject(err);
        this.loadWaiter = null;
        break;
      }
      case 'chunk':
        this.pending.get(msg.id!)?.onChunk({
          text: msg.text ?? '',
          samples: msg.samples!,
          sampleRate: msg.sampleRate ?? KOKORO_SAMPLE_RATE,
        });
        break;
      case 'done':
        this.pending.get(msg.id!)?.resolve();
        this.pending.delete(msg.id!);
        break;
      case 'error':
        this.pending.get(msg.id!)?.reject(new Error(msg.message ?? 'Kokoro generation failed'));
        this.pending.delete(msg.id!);
        break;
    }
  }

  load(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        const worker = this.ensureWorker();
        setKokoroModelStatus({ state: 'loading', progress: 0 });
        const backend = pickKokoroBackend(await detectWebGpu());
        await new Promise<void>((resolve, reject) => {
          this.loadWaiter = { resolve, reject };
          worker.postMessage({ type: 'load', ...backend });
        });
      })();
    }
    return this.loadPromise;
  }

  generate(request: KokoroGenerateRequest, onChunk: (chunk: KokoroChunk) => void): Promise<void> {
    const run = () =>
      new Promise<void>((resolve, reject) => {
        const id = this.nextId++;
        this.pending.set(id, { onChunk, resolve, reject });
        this.ensureWorker().postMessage({ type: 'generate', id, ...request });
      });
    const result = this.queue.then(run);
    this.queue = result.catch(() => {});
    return result;
  }
}

const defaultClient = new KokoroWorkerClient();

/** Start downloading/loading the model ahead of the first utterance. */
export function preloadKokoro(): Promise<void> {
  return defaultClient.load();
}

function float32ToInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

export class KokoroSpeechProvider implements SpeechEngine {
  id = 'kokoro';
  name = 'Kokoro TTS';

  constructor(private client: KokoroEngineClient = defaultClient) {}

  async generateSpeech(request: SpeechRequest): Promise<SpeechResponse> {
    return this.synthesize(request);
  }

  async generateSpeechStream(
    request: SpeechRequest,
    hooks: SpeechStreamHooks
  ): Promise<SpeechResponse> {
    return this.synthesize(request, hooks);
  }

  /**
   * Stream sentence chunks from the worker. With `hooks`, each chunk also
   * plays live; either way the accumulated audio resolves as a WAV data URI
   * plus an estimated alignment (Kokoro returns no timing of its own).
   */
  private async synthesize(
    request: SpeechRequest,
    hooks?: SpeechStreamHooks
  ): Promise<SpeechResponse> {
    await this.client.load();

    const settings = (request.options ?? {}) as KokoroSpeechSettings;
    const voiceId = request.voice?.id || settings.voice || KOKORO_DEFAULT_VOICE;
    const speed = settings.speed || 1.0;

    const int16Chunks: Int16Array[] = [];
    const alignmentChunks: KokoroAlignmentChunk[] = [];
    let sampleRate = KOKORO_SAMPLE_RATE;
    let started = false;

    await this.client.generate({ text: request.text, voice: voiceId, speed }, chunk => {
      sampleRate = chunk.sampleRate;
      const int16 = float32ToInt16(chunk.samples);
      int16Chunks.push(int16);
      alignmentChunks.push({
        text: chunk.text,
        durationSeconds: chunk.samples.length / chunk.sampleRate,
      });
      if (hooks) {
        if (!started) {
          started = true;
          hooks.onStart?.();
        }
        hooks.onAudioChunk(int16);
      }
    });

    return {
      blob: pcmToWavDataUri(int16Chunks, sampleRate),
      alignment: estimateAlignment(alignmentChunks),
    };
  }

  async listVoices(request: ListVoicesRequest): Promise<Voice[]> {
    const page = request.page || 1;
    const limit = request.limit || 100;

    let filteredVoices = KOKORO_VOICES;

    // Filter by search term (name or language)
    if (request.search) {
      const searchLower = request.search.toLowerCase();
      filteredVoices = filteredVoices.filter(
        voice =>
          voice.name.toLowerCase().includes(searchLower) ||
          voice.language.toLowerCase().includes(searchLower) ||
          voice.gender?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by language
    if (request.language) {
      filteredVoices = filteredVoices.filter(voice => voice.language === request.language);
    }

    // Sort alphabetically by name
    filteredVoices.sort((a, b) => a.name.localeCompare(b.name));

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedVoices = filteredVoices.slice(startIndex, startIndex + limit);

    return paginatedVoices;
  }
}
