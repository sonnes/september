import { AI_PROVIDERS, type AIProvidersFormData } from '@/packages/ai';
import type { Providers } from '@/packages/shared';

// Bridges the AI provider key form (flat `${id}_api_key` / `${id}_base_url`
// fields) and the account's nested `ai_providers` shape. Extracted from the
// onboarding voice step so the combined Advanced step can reuse it.

export function getProviderDefaultValues(providers?: Providers): Record<string, string> {
  const values: Record<string, string> = {};

  Object.values(AI_PROVIDERS)
    .filter(provider => provider.requires_api_key)
    .forEach(provider => {
      const config = providers?.[provider.id];
      values[`${provider.id}_api_key`] = config?.api_key || '';
      values[`${provider.id}_base_url`] = config?.base_url || '';
    });

  return values;
}

export function buildProviderConfig(data: AIProvidersFormData): Providers {
  const providerConfig: Record<string, { api_key: string; base_url?: string }> = {};

  Object.values(AI_PROVIDERS)
    .filter(provider => provider.requires_api_key)
    .forEach(provider => {
      const apiKeyField = `${provider.id}_api_key` as keyof AIProvidersFormData;
      const baseUrlField = `${provider.id}_base_url` as keyof AIProvidersFormData;
      const apiKey = data[apiKeyField] as string | undefined;
      const baseUrl = data[baseUrlField] as string | undefined;

      if (apiKey) {
        providerConfig[provider.id] = { api_key: apiKey };
        if (baseUrl) {
          providerConfig[provider.id].base_url = baseUrl;
        }
      }
    });

  return providerConfig as Providers;
}
