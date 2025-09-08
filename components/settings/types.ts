import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { z } from 'zod';

// Validation schema for the account form
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
    .union([
      z.object({
        speed: z.number().min(0.1).max(10).optional(),
        pitch: z.number().min(0).max(2).optional(),
        volume: z.number().min(0).max(1).optional(),
        language: z.string().optional(),
      }),
      z.object({
        api_key: z.string().optional(),
        model_id: z.string().optional(),
        speed: z.number().min(0.25).max(4).optional(),
        stability: z.number().min(0).max(1).optional(),
        similarity: z.number().min(0).max(1).optional(),
        style: z.number().min(0).max(1).optional(),
        speaker_boost: z.boolean().optional(),
      }),
    ])
    .optional(),
  voice: z
    .object({
      id: z.string(),
      name: z.string(),
      language: z.string(),
      gender: z.string().optional(),
      accent: z.string().optional(),
      age: z.string().optional(),
      use_case: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      preview_url: z.string().optional(),
    })
    .optional(),

  // AI Settings
  ai_instructions: z.string().optional(),
  ai_corpus: z.string().optional(),
  gemini_api_key: z.string().optional(),

  // Flags
  terms_accepted: z.boolean(),
  privacy_policy_accepted: z.boolean(),
  onboarding_completed: z.boolean(),
});

// TypeScript type inferred from the schema
export type AccountFormData = z.infer<typeof AccountSchema>;

// Interface for section component props
export interface SectionProps {
  control: Control<AccountFormData>;
  watch: UseFormWatch<AccountFormData>;
  setValue: UseFormSetValue<AccountFormData>;
}
