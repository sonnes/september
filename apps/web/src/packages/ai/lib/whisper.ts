/**
 * On-device transcription via a Whisper model in a Web Worker — the `whisper`
 * transcription provider. No API key, no network beyond the one-time model
 * download (cached by Transformers.js).
 */

const WHISPER_SAMPLE_RATE = 16000;

interface PendingTranscription {
  resolve: (text: string) => void;
  reject: (err: Error) => void;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, PendingTranscription>();

function ensureWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./whisper-worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<{ type: string; id: number; text?: string; message?: string }>) => {
      const msg = event.data;
      const request = pending.get(msg.id);
      if (!request) return;
      pending.delete(msg.id);
      if (msg.type === 'result') request.resolve(msg.text ?? '');
      else request.reject(new Error(msg.message ?? 'Transcription failed'));
    };
  }
  return worker;
}

/** Decode any browser-recordable audio blob to 16 kHz mono Float32 samples. */
async function decodeTo16kMono(audio: Blob): Promise<Float32Array> {
  const bytes = await audio.arrayBuffer();
  // An AudioContext pinned to 16 kHz resamples during decode.
  const ctx = new AudioContext({ sampleRate: WHISPER_SAMPLE_RATE });
  try {
    const buffer = await ctx.decodeAudioData(bytes);
    if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
    // Downmix to mono by averaging channels.
    const out = new Float32Array(buffer.length);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const channel = buffer.getChannelData(c);
      for (let i = 0; i < channel.length; i++) out[i] += channel[i] / buffer.numberOfChannels;
    }
    return out;
  } finally {
    void ctx.close().catch(() => {});
  }
}

export interface LocalTranscription {
  text: string;
  /** Length of the decoded audio — the unit cloud providers would have billed. */
  audio_seconds: number;
}

/** Transcribe an audio blob entirely on this device. */
export async function transcribeLocally(audio: Blob): Promise<LocalTranscription> {
  const samples = await decodeTo16kMono(audio);
  const audioSeconds = samples.length / WHISPER_SAMPLE_RATE;

  const text = await new Promise<string>((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ensureWorker().postMessage({ type: 'transcribe', id, samples }, [samples.buffer]);
  });

  return { text, audio_seconds: audioSeconds };
}
