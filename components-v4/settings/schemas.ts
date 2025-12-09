import z from 'zod';

import { AI_PROVIDERS } from './registry';

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
