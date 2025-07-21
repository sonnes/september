import { useCallback, useEffect, useRef, useState } from 'react';

import autocompleteService from '@/services/autocomplete';

interface UseAutocompleteOptions {
  maxSuggestions?: number;
  minQueryLength?: number;
}

interface UseAutocompleteReturn {
  suggestions: string[];
  isLoading: boolean;
  isReady: boolean;
  getSuggestions: (query: string) => void;
  predictNextWord: (query: string) => void;
  clearSuggestions: () => void;
}

export function useAutocomplete(options: UseAutocompleteOptions = {}): UseAutocompleteReturn {
  const { maxSuggestions = 5, minQueryLength = 2 } = options;

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Initialize service on mount
  useEffect(() => {
    const initService = async () => {
      try {
        await autocompleteService.initialize();
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize autocomplete service:', error);
      }
    };

    initService();
  }, []);

  const getSuggestions = useCallback(
    async (query: string) => {
      if (!query || query.trim().length < minQueryLength) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);

      try {
        const results = await autocompleteService.getAutocompleteSuggestions(query, {
          maxSuggestions,
          minQueryLength,
        });
        setSuggestions(results);
      } catch (error) {
        console.error('Error getting suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [maxSuggestions, minQueryLength]
  );

  const predictNextWord = useCallback(async (query: string) => {
    const results = ['hello']; //await autocompleteService.predictNextWord(query);
    setSuggestions(results);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isLoading,
    isReady,
    getSuggestions,
    predictNextWord,
    clearSuggestions,
  };
}
