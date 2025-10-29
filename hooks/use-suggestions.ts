import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTextContext } from '@/components/context/text-provider';

import { useAISettings } from '@/services/ai/context';
import GeminiService from '@/services/gemini';
import { useMessages } from '@/services/messages';

import { Message } from '@/types/message';
import { Suggestion } from '@/types/suggestion';

interface UseSuggestionsReturn {
  suggestions: Suggestion[];
  isLoading: boolean;
  clearSuggestions: () => void;
}

export function useSuggestions(timeout: number = 800): UseSuggestionsReturn {
  const { text } = useTextContext();
  const { messages } = useMessages();

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [debouncedText, setDebouncedText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);

  const { getProviderConfig, suggestions: suggestionsConfig } = useAISettings();

  const { api_key: apiKey } = useMemo(
    () => getProviderConfig(suggestionsConfig.provider) || {},
    [getProviderConfig, suggestionsConfig.provider]
  );
  const gemini = new GeminiService(apiKey || '');

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Auto-fetch suggestions when debounced text changes
  useEffect(() => {
    if (debouncedText.trim().length === 0 || !apiKey) return;

    const fetchSuggestions = async (text: string, messages: Partial<Message>[]) => {
      if (!apiKey || isLoading) {
        return;
      }

      setIsLoading(true);

      try {
        const suggestions = await gemini.generateSuggestions({
          instructions: suggestionsConfig.settings?.system_instructions || '',
          text,
          messages,
        });

        setSuggestions(suggestions.suggestions.map(text => ({ text, audio_path: undefined })));
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setIsLoading(false);
      }
    };

    fetchSuggestions(
      debouncedText,
      messages.slice(0, 5).map(m => ({ text: m.text, type: m.type }))
    );
  }, [debouncedText, messages]);

  // Debounce text changes
  useEffect(() => {
    if (text.trim().length === 0) return;

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
  fetchHistory: (text: string, messages: Partial<Message>[]) => Promise<void>;
}

export function useSearchHistory(timeout: number = 3000): UseSearchHistoryReturn {
  const { text } = useTextContext();
  const { searchMessages } = useMessages();

  const [history, setHistory] = useState<Suggestion[]>([]);
  const [debouncedText, setDebouncedText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = useCallback(
    async (text: string) => {
      setIsLoading(true);

      const history = await searchMessages(text);
      setHistory(history.map(m => ({ text: m.text, audio_path: m.audio_path })));
      setIsLoading(false);
    },
    [searchMessages]
  );

  useEffect(() => {
    if (text.trim().length === 0) return;
    fetchHistory(debouncedText);
  }, [debouncedText, fetchHistory]);

  useEffect(() => {
    if (text.trim().length === 0) return;

    const timeoutId = setTimeout(() => {
      setDebouncedText(text);
    }, timeout);
    return () => clearTimeout(timeoutId);
  }, [text]);

  return {
    history,
    isLoading,
    fetchHistory,
  };
}
