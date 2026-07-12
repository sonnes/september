/**
 * Web Worker that owns the Kokoro model. Loading (~86 MB WASM / ~326 MB
 * WebGPU, cached by Transformers.js in the browser Cache API after first
 * download) and inference both run here so synthesis never blocks the UI.
 *
 * Protocol (in): {type:'load', device, dtype} | {type:'generate', id, text, voice, speed}
 * Protocol (out): {type:'load-progress', progress}
 *               | {type:'ready', device}
 *               | {type:'load-error', message}
 *               | {type:'chunk', id, text, sampleRate, samples: Float32Array}  (transferred)
 *               | {type:'done', id}
 *               | {type:'error', id, message}
 */
import type { KokoroBackend } from './kokoro-backend';

export const KOKORO_MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';

interface LoadMessage extends KokoroBackend {
  type: 'load';
}

interface GenerateMessage {
  type: 'generate';
  id: number;
  text: string;
  voice: string;
  speed: number;
}

type InMessage = LoadMessage | GenerateMessage;

// Transformers.js reports per-file progress; aggregate bytes across files so
// the bar reflects the whole download.
interface ProgressItem {
  status: string;
  file?: string;
  loaded?: number;
  total?: number;
}

type KokoroTTSInstance = {
  stream(
    splitter: unknown,
    options: { voice: string; speed: number }
  ): AsyncIterable<{ text: string; audio: { audio: Float32Array; sampling_rate: number } }>;
};

let tts: KokoroTTSInstance | null = null;
let loadPromise: Promise<void> | null = null;

async function loadModel(device: KokoroBackend['device'], dtype: KokoroBackend['dtype']) {
  const { KokoroTTS } = await import('kokoro-js');

  const fileBytes = new Map<string, { loaded: number; total: number }>();
  const onProgress = (item: ProgressItem) => {
    if (item.status !== 'progress' || !item.file || !item.total) return;
    fileBytes.set(item.file, { loaded: item.loaded ?? 0, total: item.total });
    let loaded = 0;
    let total = 0;
    for (const f of fileBytes.values()) {
      loaded += f.loaded;
      total += f.total;
    }
    self.postMessage({ type: 'load-progress', progress: total ? loaded / total : 0 });
  };

  try {
    tts = (await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
      dtype,
      device,
      progress_callback: onProgress,
    })) as unknown as KokoroTTSInstance;
    self.postMessage({ type: 'ready', device });
  } catch (err) {
    // WebGPU exists but fails to initialize on some driver/browser combos —
    // retry once on the WASM backend before giving up.
    if (device === 'webgpu') {
      return loadModel('wasm', 'q8');
    }
    tts = null;
    loadPromise = null;
    self.postMessage({
      type: 'load-error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

async function generate(msg: GenerateMessage) {
  try {
    if (loadPromise) await loadPromise;
    if (!tts) throw new Error('Kokoro model is not loaded');

    const { TextSplitterStream } = await import('kokoro-js');
    const splitter = new TextSplitterStream();
    const stream = tts.stream(splitter, { voice: msg.voice, speed: msg.speed });
    splitter.push(msg.text);
    splitter.close();

    for await (const { text, audio } of stream) {
      const samples = audio.audio;
      self.postMessage(
        { type: 'chunk', id: msg.id, text, sampleRate: audio.sampling_rate, samples },
        // Transfer the buffer — chunks can be megabytes.
        { transfer: [samples.buffer] }
      );
    }
    self.postMessage({ type: 'done', id: msg.id });
  } catch (err) {
    self.postMessage({
      type: 'error',
      id: msg.id,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

self.onmessage = (event: MessageEvent<InMessage>) => {
  const msg = event.data;
  if (msg.type === 'load') {
    if (!loadPromise) loadPromise = loadModel(msg.device, msg.dtype);
    return;
  }
  if (msg.type === 'generate') {
    void generate(msg);
  }
};
