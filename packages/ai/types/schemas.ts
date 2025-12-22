import { z } from 'zod';

import { AI_PROVIDERS } from '../lib/registry';
import { Voice } from '@/types/voice';

// Dynamically generate Zod schema from provider registry
const createProviderSchema = () => {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  Object.values(AI_PROVIDERS).forEach(provider => {
    const apiKeyField = `${provider.id}_api_key`;
    const baseUrlField = `${provider.id}_base_url`;

    schemaFields[apiKeyField] = z.string().optional();
    schemaFields[baseUrlField] = z.string().url('Invalid URL').optional().or(z.literal(''));
  });

  return z.object(schemaFields);
};

export const AIProvidersSchema = createProviderSchema();
export type AIProvidersFormData = z.infer<typeof AIProvidersSchema>;

// Single unified schema for all account and settings data
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

export const SpeechProviderSchema = AccountSchema.pick({
  speech_provider: true,
  speech_settings: true,
  voice: true,
});

export type SpeechProviderFormData = z.infer<typeof SpeechProviderSchema>;

export const AISettingsSchema = AccountSchema.pick({
  gemini_api_key: true,
  ai_instructions: true,
  ai_corpus: true,
});

export type AISettingsFormData = z.infer<typeof AISettingsSchema>;

export const SpeechSettingsSchema = AccountSchema.pick({
  speech_settings: true,
});

export type SpeechSettingsFormData = z.infer<typeof SpeechSettingsSchema>;
