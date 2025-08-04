import { Alignment } from '@/types/audio';

export interface SpeechProvider {
  id: string;
  name: string;
  generateSpeech(request: SpeechRequest): Promise<SpeechResponse>;
  getVoices(): Promise<Voice[]>;
}

export interface SpeechRequest {
  text: string;
  voiceId?: string;
  apiKey?: string;
  options?: SpeechOptions;
}

export interface SpeechOptions {
  modelId?: string;
  speed?: number;
  stability?: number;
  similarity?: number;
  style?: number;
  speakerBoost?: boolean;
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
