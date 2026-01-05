import { Alignment } from '@/packages/audio';
import {
  KokoroSpeechSettings,
  BrowserTTSSettings,
  ElevenLabsSettings,
  GeminiSpeechSettings,
} from '@/types/ai-config';
import { Voice } from '@/types/voice';

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
