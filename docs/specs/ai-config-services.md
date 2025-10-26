# AI Configuration Services Specification

## Overview

This specification defines the service layer, business logic, hooks, and API routes for managing AI configuration in the September application.

---

## Provider Registry

```typescript
// File: services/ai/registry.ts
import { AIFeature, AIProvider, AIServiceProvider } from '@/types/ai-config';

/**
 * Registry of all supported AI providers
 */
export const AI_PROVIDERS: Record<AIProvider, AIServiceProvider> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: "Google's multimodal AI models",
    features: ['suggestions', 'transcription', 'speech'],
    requires_api_key: true,
    models: [
      {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        description: 'Fast, cost-effective for suggestions and transcription',
      },
      {
        id: 'gemini-2.5-flash-preview-tts',
        name: 'Gemini TTS',
        description: 'Text-to-speech with natural voices',
      },
    ],
  },

  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models and Whisper transcription',
    features: ['suggestions', 'transcription'],
    requires_api_key: true,
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Most capable multimodal model',
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Fast and affordable',
      },
      {
        id: 'whisper-1',
        name: 'Whisper',
        description: 'Speech-to-text transcription',
      },
    ],
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models for text generation',
    features: ['suggestions'],
    requires_api_key: true,
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        description: 'Best for complex suggestions',
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        description: 'Fast and affordable',
      },
    ],
  },

  whisper: {
    id: 'whisper',
    name: 'OpenAI Whisper',
    description: 'Dedicated speech-to-text service',
    features: ['transcription'],
    requires_api_key: true,
    models: [
      {
        id: 'whisper-1',
        name: 'Whisper v1',
        description: 'High-accuracy transcription',
      },
    ],
  },

  'assembly-ai': {
    id: 'assembly-ai',
    name: 'AssemblyAI',
    description: 'Advanced speech-to-text with speaker detection',
    features: ['transcription'],
    requires_api_key: true,
  },

  browser: {
    id: 'browser',
    name: 'Browser TTS',
    description: 'Native browser text-to-speech (no API key required)',
    features: ['speech'],
    requires_api_key: false,
  },
};

/**
 * Get providers that support a specific feature
 */
export function getProvidersForFeature(feature: AIFeature): AIServiceProvider[] {
  return Object.values(AI_PROVIDERS).filter(provider => provider.features.includes(feature));
}

/**
 * Check if a provider supports a feature
 */
export function supportsFeature(provider: AIProvider, feature: AIFeature): boolean {
  return AI_PROVIDERS[provider]?.features.includes(feature) ?? false;
}

/**
 * Get models for a specific provider
 */
export function getModelsForProvider(provider: AIProvider) {
  return AI_PROVIDERS[provider]?.models ?? [];
}
```

---

## Service Layer Hooks

### Account Service - Supabase

```typescript
// File: services/account/use-supabase.tsx
import { useCallback } from 'react';

import { useToast } from '@/hooks/use-toast';

import type { Account, PutAccountData } from '@/types/account';
import type { User } from '@/types/user';

import { AccountsService } from './supabase';

interface UseAccountSupabaseProps {
  user: User;
  account: Account;
}

export function useAccountSupabase({ user, account }: UseAccountSupabaseProps) {
  const { showError } = useToast();
  const service = new AccountsService();

  const updateAccount = useCallback(
    async (accountData: Partial<PutAccountData>) => {
      try {
        // Deep merge AI config fields
        const updates: Partial<PutAccountData> = { ...accountData };

        if (accountData.ai_suggestions) {
          updates.ai_suggestions = {
            ...account.ai_suggestions,
            ...accountData.ai_suggestions,
          };
        }

        if (accountData.ai_transcription) {
          updates.ai_transcription = {
            ...account.ai_transcription,
            ...accountData.ai_transcription,
          };
        }

        if (accountData.ai_speech) {
          updates.ai_speech = {
            ...account.ai_speech,
            ...accountData.ai_speech,
          };
        }

        if (accountData.ai_providers) {
          updates.ai_providers = {
            ...account.ai_providers,
            ...accountData.ai_providers,
          };
        }

        await service.update(user.id, updates);
      } catch (error) {
        console.error('Failed to update account:', error);
        showError('Failed to update account settings');
        throw error;
      }
    },
    [account, user.id, service, showError]
  );

  // ... rest of the hook

  return {
    user,
    account,
    updateAccount,
    // ... other methods
  };
}
```

### Account Service - Triplit

```typescript
// File: services/account/use-triplit.tsx
import { useCallback } from 'react';

import { useQueryOne } from '@triplit/react';

import { triplit } from '@/triplit/client';
import type { Account, PutAccountData } from '@/types/account';

const ID = 'local-user';

export function useAccountTriplit() {
  const query = triplit.query('accounts').where('id', '=', ID);
  const { result: account } = useQueryOne(triplit, query);

  const updateAccount = useCallback(
    async (accountData: Partial<PutAccountData>) => {
      if (!account) {
        throw new Error('Account not found');
      }

      // SECURITY: Never store provider config in local storage
      if (accountData.ai_providers) {
        console.warn('Cannot store provider config in local storage');
        delete accountData.ai_providers;
      }

      // Deep merge AI config fields
      const updates: any = { ...accountData };

      if (accountData.ai_suggestions) {
        updates.ai_suggestions = {
          ...account.ai_suggestions,
          ...accountData.ai_suggestions,
        };
      }

      if (accountData.ai_transcription) {
        updates.ai_transcription = {
          ...account.ai_transcription,
          ...accountData.ai_transcription,
        };
      }

      if (accountData.ai_speech) {
        updates.ai_speech = {
          ...account.ai_speech,
          ...accountData.ai_speech,
        };
      }

      updates.updated_at = new Date();

      await triplit.update('accounts', account.id, updates);
    },
    [account]
  );

  // ... rest of the hook

  return {
    user: account as User,
    account: account as Account,
    updateAccount,
    // ... other methods
  };
}
```

---

## Feature Access Hook

```typescript
// File: hooks/use-ai-features.ts
import { useAccount } from '@/services/account';

import type { AIFeature, AIProvider } from '@/types/ai-config';

/**
 * Hook to check AI feature availability and configuration
 */
export function useAIFeatures() {
  const { account } = useAccount();

  const getFeatureConfig = (feature: AIFeature) => {
    if (!account) return null;

    switch (feature) {
      case 'suggestions':
        return getSuggestionsConfig(account);
      case 'transcription':
        return getTranscriptionConfig(account);
      case 'speech':
        return getSpeechConfig(account);
      default:
        return null;
    }
  };

  const isFeatureEnabled = (feature: AIFeature): boolean => {
    const config = getFeatureConfig(feature);
    // Speech is always enabled (no enabled flag)
    if (feature === 'speech') return true;
    return config?.enabled ?? false;
  };

  const getFeatureProvider = (feature: AIFeature): AIProvider | null => {
    const config = getFeatureConfig(feature);
    return config?.provider ?? null;
  };

  const hasProviderConfig = (provider: AIProvider): boolean => {
    if (provider === 'browser') return true; // No config needed
    return !!account?.ai_providers?.[provider]?.api_key;
  };

  const can_use_feature = (feature: AIFeature): boolean => {
    const config = getFeatureConfig(feature);
    if (!config) return false;

    // Speech is always enabled (no enabled flag)
    // Other features check the enabled flag
    if (feature !== 'speech' && !config?.enabled) return false;

    // Browser-based features don't need config
    if (config.provider === 'browser') return true;

    // Check if we have config for the provider
    return hasProviderConfig(config.provider);
  };

  const getProviderApiKey = (provider: AIProvider): string | null => {
    if (provider === 'browser') return null;
    return account?.ai_providers?.[provider]?.api_key ?? null;
  };

  const getProviderBaseUrl = (provider: AIProvider): string | null => {
    if (provider === 'browser') return null;
    return account?.ai_providers?.[provider]?.base_url ?? null;
  };

  return {
    getFeatureConfig,
    isFeatureEnabled,
    getFeatureProvider,
    hasProviderConfig,
    can_use_feature,
    getProviderApiKey,
    getProviderBaseUrl,
  };
}
```
