'use client';

import { useCallback, useEffect, useState } from 'react';

import { useSpeechContext } from '@/packages/speech/components/speech-provider';
import type { Voice } from '@/types/voice';

type SpeechEngineId = 'browser' | 'gemini' | 'elevenlabs';

export interface UseVoiceFetchingReturn {
  voices: Voice[];
  isLoading: boolean;
  error?: { message: string };
  refetch: (provider: SpeechEngineId, search: string) => Promise<void>;
}

export function useVoiceFetching(provider: SpeechEngineId, apiKey?: string): UseVoiceFetchingReturn {
  const { getProvider } = useSpeechContext();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string }>();

  const refetch = useCallback(
    async (searchProvider: SpeechEngineId, search: string) => {
      try {
        setIsLoading(true);
        setError(undefined);
        const speechProvider = getProvider(searchProvider);
        if (speechProvider) {
          const fetchedVoices = await speechProvider.listVoices({ search, apiKey });
          setVoices(fetchedVoices || []);
        }
      } catch (err) {
        console.error('Error fetching voices:', err);
        setError({ message: err instanceof Error ? err.message : 'Failed to fetch voices' });
        setVoices([]);
      } finally {
        setIsLoading(false);
      }
    },
    [getProvider, apiKey]
  );

  // Auto-fetch on mount or when provider/apiKey changes
  useEffect(() => {
    refetch(provider, '');
  }, [provider, apiKey, refetch]);

  return { voices, isLoading, error, refetch };
}
