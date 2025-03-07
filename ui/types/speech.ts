import { LibraryVoiceResponse } from 'elevenlabs/api';

export type Voice = LibraryVoiceResponse;

export interface SpeechSettings {
  voice_id?: string;
  model_id?: string;
  speed?: number;
  stability?: number;
  similarity?: number;
  style?: number;
  speaker_boost?: boolean;
}
