import { Providers, SpeechConfig, SuggestionsConfig, TranscriptionConfig } from '@/types/ai-config';
import { Voice } from '@/types/voice';
import { z } from 'zod';

export const AccountSchema = z.object({
  // Personal Information
  name: z.string().min(1, 'Name is required'),
  city: z.string().optional(),
  country: z.string().optional(),
  // Medical Information
  primary_diagnosis: z.string().optional(),
  year_of_diagnosis: z.number().min(1900).max(new Date().getFullYear()).optional(),
  medical_document_path: z.string().optional(),
  // Speech Settings
  speech_provider: z.string().optional(),
  speech_settings: z
    .object({
      speed: z.number().min(0.1).max(10).optional(),
      pitch: z.number().min(0).max(2).optional(),
      volume: z.number().min(0).max(1).optional(),
      api_key: z.string().optional(),
      model_id: z.string().optional(),
      voice_name: z.string().optional(),
      stability: z.number().min(0).max(1).optional(),
      similarity: z.number().min(0).max(1).optional(),
      style: z.number().min(0).max(1).optional(),
      speaker_boost: z.boolean().optional(),
    })
    .optional(),
  voice: z.custom<Voice>().optional(),
  // AI Settings
  ai_instructions: z.string().optional(),
  ai_corpus: z.string().optional(),
  gemini_api_key: z.string().optional(),
  // Terms and Privacy
  terms_accepted: z.boolean().optional(),
  privacy_policy_accepted: z.boolean().optional(),
});

export type AccountFormData = z.infer<typeof AccountSchema>;

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
  ai_providers?: Providers;

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
