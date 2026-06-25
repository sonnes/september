import { Alignment } from '@/packages/audio';
import {
  KokoroSpeechSettings,
  BrowserTTSSettings,
  ElevenLabsSettings,
  GeminiSpeechSettings,
} from '@/packages/shared';
import { Voice } from '@/packages/shared';

export interface SpeechEngine {
  id: string;
  name: string;
  generateSpeech(request: SpeechRequest): Promise<SpeechResponse>;
  listVoices(request: ListVoicesRequest): Promise<Voice[]>;
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
