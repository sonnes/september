import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTextContext } from '@/components/context/text-provider';

import GeminiService from '@/services/gemini';
import { useMessages } from '@/services/messages';

import { useEditorContext } from '@/components-v4/editor/context';
import { useAISettings } from '@/components-v4/settings';
import { Message } from '@/types/message';
import { Suggestion } from '@/types/suggestion';

interface UseSuggestionsReturn {
  suggestions: Suggestion[];
  isLoading: boolean;
  clearSuggestions: () => void;
}

export function useSuggestions(timeout: number = 800): UseSuggestionsReturn {
  const { text } = useEditorContext();

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [debouncedText, setDebouncedText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);

  const { getProviderConfig, suggestionsConfig } = useAISettings();

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

    fetchSuggestions(debouncedText, []);
  }, [debouncedText]);

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
