'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAISettings } from '@/components/settings';

import GeminiService from '@/services/gemini';
import { useMessages } from '@/services/messages';

import { Message } from '@/packages/chats';

import { Suggestion } from '../types';

interface UseSuggestionsReturn {
  suggestions: Suggestion[];
  isLoading: boolean;
  clearSuggestions: () => void;
}

export function useSuggestions({
  text,
  timeout = 800,
}: {
  text: string;
  timeout?: number;
}): UseSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [debouncedText, setDebouncedText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);

  const { getProviderConfig, suggestionsConfig } = useAISettings();

  const providerConfig = useMemo(
    () => getProviderConfig(suggestionsConfig.provider),
    [getProviderConfig, suggestionsConfig.provider]
  );

  const apiKey = providerConfig?.api_key;
  const gemini = useMemo(() => new GeminiService(apiKey || ''), [apiKey]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Auto-fetch suggestions when debounced text changes
  useEffect(() => {
    if (debouncedText.trim().length === 0 || !apiKey) {
      if (debouncedText.trim().length === 0) {
        setSuggestions([]);
      }
      return;
    }

    const fetchSuggestions = async (text: string, messages: Partial<Message>[]) => {
      if (!apiKey || isLoading || !suggestionsConfig.enabled) {
        return;
      }

      setIsLoading(true);

      try {
        const result = await gemini.generateSuggestions({
          instructions: suggestionsConfig.settings?.system_instructions || '',
          text,
          messages,
        });

        setSuggestions(result.suggestions.map(text => ({ text, audio_path: undefined })));
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions(debouncedText, []);
  }, [debouncedText, apiKey, suggestionsConfig.enabled, gemini]);

  // Debounce text changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedText(text);
    }, timeout);
    return () => clearTimeout(timeoutId);
  }, [text, timeout]);

  return {
    suggestions,
    isLoading,
    clearSuggestions,
  };
}

interface UseSearchHistoryReturn {
  history: Suggestion[];
  isLoading: boolean;
  fetchHistory: (text: string) => Promise<void>;
}

export function useSearchHistory(timeout: number = 3000): UseSearchHistoryReturn {
  const [history, setHistory] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { searchMessages } = useMessages();

  const fetchHistory = useCallback(
    async (text: string) => {
      if (text.trim().length === 0) {
        setHistory([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchMessages(text);
        setHistory(results.map(m => ({ text: m.text, audio_path: m.audio_path })));
      } catch (error) {
        console.error('Error fetching search history:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [searchMessages]
  );

  return {
    history,
    isLoading,
    fetchHistory,
  };
}
