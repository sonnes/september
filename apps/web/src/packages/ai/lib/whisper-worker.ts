/**
 * Web Worker that owns the local Whisper model for on-device transcription.
 * The model (~80 MB quantized) downloads once from the Hugging Face CDN and is
 * cached by Transformers.js in the browser Cache API; audio never leaves the
 * device.
 *
 * Protocol (in): {type:'transcribe', id, samples: Float32Array}  — 16 kHz mono
 * Protocol (out): {type:'result', id, text} | {type:'error', id, message}
 */
export const WHISPER_MODEL_ID = 'onnx-community/whisper-base';

interface TranscribeMessage {
  type: 'transcribe';
  id: number;
  samples: Float32Array;
}

type AsrPipeline = (samples: Float32Array, options?: object) => Promise<{ text: string }>;

let asrPromise: Promise<AsrPipeline> | null = null;

async function loadPipeline(device: 'webgpu' | 'wasm'): Promise<AsrPipeline> {
  const { pipeline } = await import('@huggingface/transformers');
  try {
    return (await pipeline('automatic-speech-recognition', WHISPER_MODEL_ID, {
      device,
      dtype: 'q8',
    })) as unknown as AsrPipeline;
  } catch (err) {
    // WebGPU exists but fails on some driver/browser combos — retry on WASM.
    if (device === 'webgpu') return loadPipeline('wasm');
    throw err;
  }
}

function ensurePipeline(): Promise<AsrPipeline> {
  if (!asrPromise) {
    const hasWebGpu = 'gpu' in navigator;
    asrPromise = loadPipeline(hasWebGpu ? 'webgpu' : 'wasm').catch(err => {
      asrPromise = null; // allow retry on the next request
      throw err;
    });
  }
  return asrPromise;
}

self.onmessage = async (event: MessageEvent<TranscribeMessage>) => {
  const msg = event.data;
  if (msg.type !== 'transcribe') return;
  try {
    const asr = await ensurePipeline();
    // chunking handles clips longer than Whisper's 30 s window.
    const output = await asr(msg.samples, { chunk_length_s: 30 });
    self.postMessage({ type: 'result', id: msg.id, text: output.text ?? '' });
  } catch (err) {
    self.postMessage({
      type: 'error',
      id: msg.id,
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
