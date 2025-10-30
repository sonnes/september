import { ProviderConfig, SpeechConfig, SuggestionsConfig, TranscriptionConfig } from './ai-config';
import { Voice } from './voice';

export interface Account {
  id: string;

  // Personal Information
  name: string;
  city?: string;
  country?: string;

  // Medical Information
  primary_diagnosis?: string;
  year_of_diagnosis?: number;
  medical_document_path?: string;

  // AI Feature Configurations
  ai_suggestions?: SuggestionsConfig;
  ai_transcription?: TranscriptionConfig;
  ai_speech?: SpeechConfig;

  // Provider Config (Supabase only)
  ai_providers?: ProviderConfig;

  // DEPRECATED: Legacy fields (keep for backward compatibility)
  speech_provider?: string;
  speech_settings?: BrowserTTSSettings & ElevenLabsSettings & GeminiSpeechSettings;
  voice?: Voice;
  ai_instructions?: string;
  ai_corpus?: string;
  gemini_api_key?: string;

  // Flags
  terms_accepted?: boolean;
  privacy_policy_accepted?: boolean;
  onboarding_completed?: boolean;
  is_approved?: boolean;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export type PutAccountData = Partial<Omit<Account, 'id' | 'created_at' | 'updated_at'>>;

export interface BrowserTTSSettings {
  speed?: number;
  pitch?: number;
  volume?: number;
  language?: string;
}

export interface ElevenLabsSettings {
  api_key?: string;
  model_id?: string;
  speed?: number;
  stability?: number;
  similarity?: number;
  style?: number;
  speaker_boost?: boolean;
}

export interface GeminiSpeechSettings {
  api_key?: string;
  model_id?: string;
  voice_name?: string;
}
