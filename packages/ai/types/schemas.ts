import { z } from 'zod';

// Keep these as they are used in AI settings
import { AccountSchema } from '@/packages/account';
import { AI_PROVIDERS } from '@/packages/ai/lib/registry';

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

// Re-export Account related types from the account package to avoid breaking changes
export { AccountSchema } from '@/packages/account';
export type { AccountFormData } from '@/packages/account';

export const SpeechProviderSchema = AccountSchema.pick({
  ai_speech: true,
});

export type SpeechProviderFormData = z.infer<typeof SpeechProviderSchema>;

export const AISettingsSchema = AccountSchema.pick({
  ai_suggestions: true,
  ai_transcription: true,
});

export type AISettingsFormData = z.infer<typeof AISettingsSchema>;

export const SpeechSettingsSchema = AccountSchema.pick({
  ai_speech: true,
});

export type SpeechSettingsFormData = z.infer<typeof SpeechSettingsSchema>;
