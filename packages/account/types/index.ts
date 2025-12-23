import { z } from 'zod';

import { Providers, SpeechConfig, SuggestionsConfig, TranscriptionConfig } from '@/types/ai-config';

export const SuggestionsConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.literal('gemini'),
  model: z.string().optional(),
  settings: z
    .object({
      temperature: z.number().min(0).max(1).optional(),
      max_suggestions: z.number().optional(),
      context_window: z.number().optional(),
      system_instructions: z.string().optional(),
      ai_corpus: z.string().optional(),
    })
    .optional(),
});

export const TranscriptionConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.literal('gemini'),
  model: z.string().optional(),
  settings: z
    .object({
      language: z.string().optional(),
      detect_language: z.boolean().optional(),
      include_timestamps: z.boolean().optional(),
      filter_profanity: z.boolean().optional(),
    })
    .optional(),
});

export const SpeechConfigSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.enum(['browser', 'gemini', 'elevenlabs']),
  voice_id: z.string().optional(),
  voice_name: z.string().optional(),
  model_id: z.string().optional(),
  settings: z
    .object({
      speed: z.number().optional(),
      pitch: z.number().optional(),
      volume: z.number().optional(),
      stability: z.number().optional(),
      similarity: z.number().optional(),
      style: z.number().optional(),
      speaker_boost: z.boolean().optional(),
      model_id: z.string().optional(),
      voice_name: z.string().optional(),
    })
    .optional(),
});

export const ProvidersSchema = z.object({
  gemini: z
    .object({
      api_key: z.string().optional(),
      base_url: z.string().optional(),
    })
    .optional(),
  elevenlabs: z
    .object({
      api_key: z.string().optional(),
      base_url: z.string().optional(),
    })
    .optional(),
  browser: z
    .object({
      api_key: z.string().optional(),
      base_url: z.string().optional(),
    })
    .optional(),
});

export const AccountSchema = z.object({
  id: z.string().min(1),
  // Personal Information
  name: z.string().min(1, 'Name is required'),
  city: z.string().optional(),
  country: z.string().optional(),
  // Medical Information
  primary_diagnosis: z.string().optional(),
  year_of_diagnosis: z.number().min(1900).max(new Date().getFullYear()).optional(),
  medical_document_path: z.string().optional(),

  // AI Feature Configurations
  ai_suggestions: SuggestionsConfigSchema.optional().default({
    enabled: false,
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    settings: {},
  }),
  ai_transcription: TranscriptionConfigSchema.optional().default({
    enabled: false,
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    settings: {},
  }),
  ai_speech: SpeechConfigSchema.optional().default({
    enabled: true,
    provider: 'browser',
    settings: {},
  }),

  // Provider Config
  ai_providers: ProvidersSchema.optional().default({}),

  // Flags
  terms_accepted: z.boolean().optional().default(false),
  privacy_policy_accepted: z.boolean().optional().default(false),
  onboarding_completed: z.boolean().optional().default(false),
  is_approved: z.boolean().optional().default(false),

  // Timestamps
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export type Account = z.infer<typeof AccountSchema>;
export type CreateAccountData = z.input<typeof AccountSchema>;
export type AccountFormData = Account;

export type PutAccountData = Partial<Omit<Account, 'id' | 'created_at'>>;
