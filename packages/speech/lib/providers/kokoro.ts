import {
  ListVoicesRequest,
  SpeechEngine,
  SpeechRequest,
  SpeechResponse,
} from '@/packages/speech/types';
import { KokoroSpeechSettings } from '@/types/ai-config';
import { Voice } from '@/types/voice';

// Static voice definitions (28 Kokoro voices)
// Based on actual kokoro-js voice list
const KOKORO_VOICES: Voice[] = [
  // English US (13 voices)
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

  // English GB (7 voices)
  { id: 'bf_emma', name: 'Emma', language: 'en-gb', gender: 'Female' },
  { id: 'bf_isabella', name: 'Isabella', language: 'en-gb', gender: 'Female' },
  { id: 'bf_alice', name: 'Alice', language: 'en-gb', gender: 'Female' },
  { id: 'bf_lily', name: 'Lily', language: 'en-gb', gender: 'Female' },
  { id: 'bm_george', name: 'George', language: 'en-gb', gender: 'Male' },
  { id: 'bm_lewis', name: 'Lewis', language: 'en-gb', gender: 'Male' },
  { id: 'bm_daniel', name: 'Daniel', language: 'en-gb', gender: 'Male' },
  { id: 'bm_fable', name: 'Fable', language: 'en-gb', gender: 'Male' },
];

/**
 * Convert Float32Array PCM audio to WAV format
 * @param pcmData - Float32Array PCM data (normalized -1 to 1)
 * @param sampleRate - Sample rate (24000 Hz for Kokoro)
 * @param numChannels - Number of channels (1 for mono)
 * @returns Data URL with WAV audio
 */
function convertFloat32ToWav(
  pcmData: Float32Array,
  sampleRate: number,
  numChannels: number
): string {
  // Convert Float32 to Int16 PCM
  const int16Data = new Int16Array(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    const s = Math.max(-1, Math.min(1, pcmData[i])); // Clamp to [-1, 1]
    int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff; // Convert to 16-bit
  }

  // Create WAV header
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = int16Data.length * 2; // 2 bytes per sample for 16-bit

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // File size - 8
  writeString(view, 8, 'WAVE');

  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample

  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true); // Subchunk2Size

  // Combine header and PCM data
  const wavData = new Uint8Array(44 + dataSize);
  wavData.set(new Uint8Array(wavHeader), 0);
  wavData.set(new Uint8Array(int16Data.buffer), 44);

  // Convert to base64
  let binary = '';
  const len = wavData.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(wavData[i]);
  }
  const base64 = btoa(binary);

  return `data:audio/wav;base64,${base64}`;
}

/**
 * Helper function to write string to DataView
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export class KokoroSpeechProvider implements SpeechEngine {
  id = 'kokoro';
  name = 'Kokoro TTS';

  // Lazy-loaded TTS engine (initialized on first use)
  private tts: any = null; // Will be KokoroTTS from kokoro-js
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Engine initialized lazily on first generateSpeech() call
  }

  /**
   * Initialize the TTS model (lazy loading)
   * Uses kokoro-js npm package for Kokoro TTS
   */
  private async initializeModel(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Check if running in browser environment
    if (typeof window === 'undefined') {
      throw new Error('Kokoro TTS is only available in browser environments');
    }

    this.initializationPromise = (async () => {
      // Dynamically import kokoro-js to avoid loading on page load
      const { KokoroTTS } = await import('kokoro-js');

      console.log('[Kokoro] Loading Kokoro TTS model...');

      // Initialize the TTS model with fp32 precision for best quality
      // Options: "fp32", "fp16", "q8", "q4", "q4f16"
      this.tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
        dtype: 'q8', // Quantized for faster loading, good quality
        device: 'webgpu',
      });

      this.isInitialized = true;
      console.log('[Kokoro] Model loaded successfully');
    })();

    return this.initializationPromise;
  }

  async generateSpeech(request: SpeechRequest): Promise<SpeechResponse> {
    // Initialize model on first call
    if (!this.isInitialized) {
      await this.initializeModel();
    }

    const settings = request.options as KokoroSpeechSettings;
    const voiceId = request.voice?.id || settings.voice || 'af_bella';
    const speed = settings.speed || 1.0;

    try {
      // Generate speech using kokoro-js API
      // The generate method returns an audio object with { data: Float32Array, sampling_rate: number }
      const audio = await this.tts.generate(request.text, {
        voice: voiceId,
        speed,
      });

      // Get audio data as Float32Array from the audio object
      const pcmData = audio.data;
      const sampleRate = audio.sampling_rate || 24000;

      // Convert Float32Array PCM to WAV blob
      const wavBlob = convertFloat32ToWav(pcmData, sampleRate, 1);

      return {
        blob: wavBlob,
      };
    } catch (err) {
      console.error('Kokoro speech generation error:', err);
      throw new Error(`Kokoro TTS error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
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
