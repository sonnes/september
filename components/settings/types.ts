import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { z } from 'zod';

export const SettingsSchema = z.object({
  // Speech Settings
  speech_provider: z.string().optional(),
  speech_settings: z
    .object({
      speed: z.number().min(0.1).max(10).optional(),
      pitch: z.number().min(0).max(2).optional(),
      volume: z.number().min(0).max(1).optional(),
      api_key: z.string().optional(),
      model_id: z.string().optional(),
      stability: z.number().min(0).max(1).optional(),
      similarity: z.number().min(0).max(1).optional(),
      style: z.number().min(0).max(1).optional(),
      speaker_boost: z.boolean().optional(),
    })
    .optional(),
  // AI Settings
  ai_instructions: z.string().optional(),
  ai_corpus: z.string().optional(),
  gemini_api_key: z.string().optional(),
});

export type SettingsFormData = z.infer<typeof SettingsSchema>;

export interface SectionProps {
  control: Control<SettingsFormData>;
  watch: UseFormWatch<SettingsFormData>;
  setValue: UseFormSetValue<SettingsFormData>;
}
