'use client';

import { useMemo } from 'react';

import { getModelsForProvider } from '@/packages/ai';

type SpeechEngineId = 'browser' | 'gemini' | 'elevenlabs';

export interface UseProviderModelsReturn {
  models: Array<{ id: string; name: string; description?: string }>;
  defaultModel?: string;
}

export function useProviderModels(provider: SpeechEngineId): UseProviderModelsReturn {
  const models = useMemo(() => {
    return getModelsForProvider(provider);
  }, [provider]);

  const defaultModel = useMemo(() => {
    return models?.[0]?.id;
  }, [models]);

  return { models, defaultModel };
}
