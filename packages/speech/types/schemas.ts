import z from 'zod';
import type { AIProvider } from '@/types/ai-config';

export const VoiceSettingsSchema = z.object({
  provider: z.enum(['browser', 'gemini', 'elevenlabs', 'kokoro'] as const satisfies readonly AIProvider[]),
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
      // Kokoro settings
      language: z.string().optional(),
    })
    .optional(),
});

export type VoiceSettingsFormData = z.infer<typeof VoiceSettingsSchema>;

