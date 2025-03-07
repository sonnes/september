import { Voice as ElevenLabsVoice } from 'elevenlabs/api';

export type Voice = ElevenLabsVoice;

export interface SpeechSettings {
  voice_id?: string;
  model_id?: string;
  speed?: number;
  stability?: number;
  similarity?: number;
  style?: number;
  speaker_boost?: boolean;
}
