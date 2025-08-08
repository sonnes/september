import { BrowserTTSSettings, ElevenLabsSettings } from '@/types/account';
import { Alignment } from '@/types/audio';

export interface SpeechProvider {
  id: string;
  name: string;
  generateSpeech(request: SpeechRequest): Promise<SpeechResponse>;
  getVoices(): Promise<Voice[]>;
}

export interface SpeechRequest {
  text: string;
  options?: SpeechOptions;
}

export type SpeechOptions = ElevenLabsSettings | BrowserTTSSettings;

export interface SpeechResponse {
  utterance?: SpeechSynthesisUtterance;
  blob?: string;
  alignment?: Alignment;
}

export interface Voice {
  id: string;
  name: string;
  language: string;
}
