import z from 'zod';

import type { AIProvider } from '@/types/ai-config';

export const VoiceSettingsSchema = z.object({
  provider: z.enum(['browser', 'gemini', 'elevenlabs'] as const satisfies readonly AIProvider[]),
  voice_id: z.string().optional(),
  voice_name: z.string().optional(),
  model_id: z.string().optional(),
});

export type VoiceSettingsFormData = z.infer<typeof VoiceSettingsSchema>;
