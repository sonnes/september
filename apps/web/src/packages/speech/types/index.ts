import { Alignment } from '@/packages/audio';
import {
  KokoroSpeechSettings,
  BrowserTTSSettings,
  ElevenLabsSettings,
  GeminiSpeechSettings,
} from '@/packages/shared';
import { Voice } from '@/packages/shared';

export interface SpeechStreamHooks {
  /** Called with each decoded PCM chunk as it arrives, for live playback. */
  onAudioChunk: (int16: Int16Array) => void;
  /** Called once, when the first audio chunk arrives. */
  onStart?: () => void;
}

export interface SpeechEngine {
  id: string;
  name: string;
  generateSpeech(request: SpeechRequest): Promise<SpeechResponse>;
  listVoices(request: ListVoicesRequest): Promise<Voice[]>;
  /**
   * Low-latency streaming synthesis. Plays PCM chunks live via `hooks` and
   * resolves with the full blob + alignment. ElevenLabs streams over an
   * already-open WebSocket (`socket`); Kokoro streams from its local worker
   * and takes no socket. Callers fall back to `generateSpeech` when absent.
   */
  generateSpeechStream?(
    request: SpeechRequest,
    hooks: SpeechStreamHooks,
    socket?: WebSocket
  ): Promise<SpeechResponse>;
}

export interface SpeechRequest {
  text: string;
  voice?: Voice;
  options?: SpeechOptions;
  /** Text preceding this utterance, for prosodic continuity (ElevenLabs only). */
  previous_text?: string;
}

export type SpeechOptions =
  | ElevenLabsSettings
  | BrowserTTSSettings
  | GeminiSpeechSettings
  | KokoroSpeechSettings;

export interface SpeechResponse {
  utterance?: SpeechSynthesisUtterance;
  blob?: string;
  alignment?: Alignment;
}

export interface ListVoicesRequest {
  search?: string;
  language?: string;
  page?: number;
  limit?: number;
  apiKey?: string;
}
