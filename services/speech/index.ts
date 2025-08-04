import { Alignment } from '@/types/audio';

export interface SpeechProvider {
  id: string;
  name: string;
  apiKey?: string;
  generateSpeech(request: SpeechRequest): Promise<SpeechResponse>;
  getVoices(): Promise<Voice[]>;
}

export interface SpeechRequest {
  text: string;
  voiceId?: string;
  options?: SpeechOptions;
}

export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  language?: string;
}

export interface SpeechResponse {
  blob: string;
  alignment?: Alignment;
  duration?: number;
}

export interface Voice {
  id: string;
  name: string;
  language: string;
}
