import { Alignment } from '@/packages/audio';
import { BrowserTTSSettings, ElevenLabsSettings, GeminiSpeechSettings } from '@/types/ai-config';
import { Voice } from '@/types/voice';

export interface SpeechProvider {
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

export type SpeechOptions = ElevenLabsSettings | BrowserTTSSettings | GeminiSpeechSettings;

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
