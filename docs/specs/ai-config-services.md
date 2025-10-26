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
    requiresApiKey: true,
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
    requiresApiKey: true,
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
    requiresApiKey: true,
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
    requiresApiKey: true,
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
    requiresApiKey: true,
  },

  browser: {
    id: 'browser',
    name: 'Browser TTS',
    description: 'Native browser text-to-speech (no API key required)',
    features: ['speech'],
    requiresApiKey: false,
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

## Migration Utilities

```typescript
// File: lib/ai/migration.ts
import { Account } from '@/types/account';
import {
  ProviderConfig,
  SpeechConfig,
  SuggestionsConfig,
  TranscriptionConfig,
} from '@/types/ai-config';

import {
  DEFAULT_SPEECH_CONFIG,
  DEFAULT_SUGGESTIONS_CONFIG,
  DEFAULT_TRANSCRIPTION_CONFIG,
} from './defaults';

/**
 * Migrate legacy account data to new AI config structure
 */
export function migrateAccountAIConfig(account: Account): {
  ai_suggestions: SuggestionsConfig;
  ai_transcription: TranscriptionConfig;
  ai_speech: SpeechConfig;
  ai_providers: ProviderConfig;
} {
  // If already migrated, return existing configs
  if (account.ai_suggestions && account.ai_transcription && account.ai_speech) {
    return {
      ai_suggestions: account.ai_suggestions,
      ai_transcription: account.ai_transcription,
      ai_speech: account.ai_speech,
      ai_providers: account.ai_providers || {},
    };
  }

  // Migrate from legacy fields
  const hasGeminiKey = !!account.gemini_api_key;
  const hasSpeechProvider = !!account.speech_provider;

  return {
    ai_suggestions: {
      ...DEFAULT_SUGGESTIONS_CONFIG,
      enabled: hasGeminiKey,
      provider: 'gemini',
    },

    ai_transcription: {
      ...DEFAULT_TRANSCRIPTION_CONFIG,
      enabled: hasGeminiKey,
      provider: 'gemini',
    },

    ai_speech: hasSpeechProvider
      ? {
          enabled: true,
          provider: account.speech_provider as 'gemini' | 'elevenlabs' | 'browser',
          voice_id: account.voice?.id,
          settings: account.speech_settings || {},
        }
      : DEFAULT_SPEECH_CONFIG,

    ai_providers: {
      gemini: account.gemini_api_key ? { api_key: account.gemini_api_key } : undefined,
      eleven_labs:
        account.speech_provider === 'elevenlabs' && (account.speech_settings as any)?.api_key
          ? { api_key: (account.speech_settings as any).api_key }
          : undefined,
    },
  };
}

/**
 * Check if account needs migration
 */
export function needsMigration(account: Account): boolean {
  return !account.ai_suggestions || !account.ai_transcription || !account.ai_speech;
}

/**
 * Get feature config with fallback to defaults
 */
export function getSuggestionsConfig(account: Account): SuggestionsConfig {
  return account.ai_suggestions || DEFAULT_SUGGESTIONS_CONFIG;
}

export function getTranscriptionConfig(account: Account): TranscriptionConfig {
  return account.ai_transcription || DEFAULT_TRANSCRIPTION_CONFIG;
}

export function getSpeechConfig(account: Account): SpeechConfig {
  return account.ai_speech || DEFAULT_SPEECH_CONFIG;
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

import { getSpeechConfig, getSuggestionsConfig, getTranscriptionConfig } from '@/lib/ai/migration';
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
    return config?.enabled ?? false;
  };

  const getFeatureProvider = (feature: AIFeature): AIProvider | null => {
    const config = getFeatureConfig(feature);
    return config?.provider ?? null;
  };

  const has_provider_config = (provider: AIProvider): boolean => {
    if (provider === 'browser') return true; // No config needed
    return !!account?.ai_providers?.[provider]?.api_key;
  };

  const can_use_feature = (feature: AIFeature): boolean => {
    const config = getFeatureConfig(feature);
    if (!config?.enabled) return false;

    // Browser-based features don't need config
    if (config.provider === 'browser') return true;

    // Check if we have config for the provider
    return has_provider_config(config.provider);
  };

  const get_provider_api_key = (provider: AIProvider): string | null => {
    if (provider === 'browser') return null;
    return account?.ai_providers?.[provider]?.api_key ?? null;
  };

  const get_provider_base_url = (provider: AIProvider): string | null => {
    if (provider === 'browser') return null;
    return account?.ai_providers?.[provider]?.base_url ?? null;
  };

  return {
    getFeatureConfig,
    isFeatureEnabled,
    getFeatureProvider,
    hasProviderConfig,
    canUseFeature,
    getProviderApiKey,
    getProviderBaseUrl,
  };
}
```

---

## API Routes

### Suggestions API

```typescript
// File: app/api/ai/suggestions/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { AccountsService } from '@/services/account/supabase';
import GeminiService from '@/services/gemini';

import { getSuggestionsConfig } from '@/lib/ai/migration';
import { getServerSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required for AI suggestions' },
        { status: 401 }
      );
    }

    const accountService = new AccountsService();
    const account = await accountService.get(session.user.id);

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Get feature configuration
    const config = getSuggestionsConfig(account);

    if (!config.enabled) {
      return NextResponse.json({ error: 'Suggestions feature is not enabled' }, { status: 403 });
    }

    // Get API key and base URL for the configured provider
    const providerConfig = account.ai_providers?.[config.provider];
    const api_key = providerConfig?.api_key;
    const base_url = providerConfig?.base_url;

    if (!api_key) {
      return NextResponse.json(
        { error: `No API key configured for ${config.provider}` },
        { status: 400 }
      );
    }

    // Parse request body
    const { text, messages, instructions } = await req.json();

    // Use appropriate service based on provider
    let suggestions: string[] = [];

    switch (config.provider) {
      case 'gemini': {
        const gemini = new GeminiService(api_key, base_url);
        const result = await gemini.generateSuggestions({
          text,
          messages,
          instructions: instructions || account.ai_instructions || '',
        });
        suggestions = result.suggestions;
        break;
      }

      case 'openai':
        // TODO: Implement OpenAI service
        return NextResponse.json({ error: 'OpenAI provider not yet implemented' }, { status: 501 });

      case 'anthropic':
        // TODO: Implement Anthropic service
        return NextResponse.json(
          { error: 'Anthropic provider not yet implemented' },
          { status: 501 }
        );

      default:
        return NextResponse.json(
          { error: `Unsupported provider: ${config.provider}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
```

### Transcription API

```typescript
// File: app/api/ai/transcription/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { AccountsService } from '@/services/account/supabase';
import GeminiService from '@/services/gemini';

import { getTranscriptionConfig } from '@/lib/ai/migration';
import { getServerSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required for transcription' },
        { status: 401 }
      );
    }

    const accountService = new AccountsService();
    const account = await accountService.get(session.user.id);

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Get feature configuration
    const config = getTranscriptionConfig(account);

    if (!config.enabled) {
      return NextResponse.json({ error: 'Transcription feature is not enabled' }, { status: 403 });
    }

    // Get API key and base URL
    const providerConfig = account.ai_providers?.[config.provider];
    const api_key = providerConfig?.api_key;
    const base_url = providerConfig?.base_url;

    if (!api_key) {
      return NextResponse.json(
        { error: `No API key configured for ${config.provider}` },
        { status: 400 }
      );
    }

    // Parse audio from form data
    const formData = await req.formData();
    const audio = formData.get('audio') as Blob;

    if (!audio) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    // Use appropriate service based on provider
    let transcription = '';

    switch (config.provider) {
      case 'gemini': {
        const gemini = new GeminiService(api_key, base_url);
        const result = await gemini.transcribeAudio({ audio });
        transcription = result.text;
        break;
      }

      case 'whisper':
      case 'assembly-ai':
        // TODO: Implement other providers
        return NextResponse.json(
          { error: `${config.provider} provider not yet implemented` },
          { status: 501 }
        );

      default:
        return NextResponse.json(
          { error: `Unsupported provider: ${config.provider}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ text: transcription });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
```

---

## Rate Limiting

```typescript
// File: lib/ai/rate-limit.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export async function checkRateLimit(
  userId: string,
  feature: AIFeature
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:${userId}:${feature}`;
  const limit = 100; // requests per hour
  const window = 3600; // 1 hour in seconds

  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, window);
  }

  const remaining = Math.max(0, limit - current);

  return {
    allowed: current <= limit,
    remaining,
  };
}
```

---

## Analytics & Monitoring

```typescript
// File: lib/ai/analytics.ts

export function trackAIConfigMigration(userId: string, status: 'started' | 'completed' | 'failed') {
  // Using your analytics service
  analytics.track('AI Config Migration', {
    userId,
    status,
    timestamp: new Date().toISOString(),
  });
}

export function trackFeatureUsage(
  userId: string,
  feature: AIFeature,
  provider: AIProvider,
  success: boolean
) {
  analytics.track('AI Feature Used', {
    userId,
    feature,
    provider,
    success,
    timestamp: new Date().toISOString(),
  });
}
```
