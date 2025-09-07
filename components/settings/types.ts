import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { z } from 'zod';

// Validation schema for the talk settings form
export const SpeechSettingsSchema = z.object({
  speech_provider: z.string().min(1, 'Speech provider is required'),

  elevenlabs_settings: z.object({
    api_key: z.string().min(1, 'API key is required'),
    model_id: z.string().optional(),
    voice_id: z.string().optional(),
    speed: z.number().min(0.7).max(1.2),
    stability: z.number().min(0).max(1),
    similarity: z.number().min(0).max(1),
    style: z.number().min(0).max(1),
    speaker_boost: z.boolean(),
  }),
  browser_tts_settings: z.object({
    voice_id: z.string().optional(),
    speed: z.number().min(0.5).max(2.0),
    pitch: z.number().min(-20).max(20).optional(),
    volume: z.number().min(0).max(1).optional(),
    language: z.string().optional(),
  }),
});

// TypeScript type inferred from the schema
export type SpeechSettingsFormData = z.infer<typeof SpeechSettingsSchema>;

// Interface for section component props
export interface SectionProps {
  control: Control<SpeechSettingsFormData>;
  watch: UseFormWatch<SpeechSettingsFormData>;
  setValue: UseFormSetValue<SpeechSettingsFormData>;
}
