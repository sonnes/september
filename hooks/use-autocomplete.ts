import { useCallback, useEffect, useRef, useState } from 'react';

import Transformer from '@/lib/transformer';
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
  const transformerRef = useRef<Transformer | null>(null);

  // Initialize service and transformer on mount
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize both services in parallel
        await Promise.all([
          autocompleteService.initialize(),
          (async () => {
            if (!transformerRef.current) {
              transformerRef.current = new Transformer();

              const response = await fetch('/corpus.csv');
              const trainingText = await response.text();

              await transformerRef.current.train({
                name: 'test',
                text: trainingText.slice(0, 100000),
              });
            }
          })(),
        ]);

        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    };

    initializeServices();
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

  const predictNextWord = useCallback(
    async (query: string) => {
      if (!transformerRef.current || !isReady) {
        setSuggestions([]);
        return;
      }

      try {
        const result = transformerRef.current.getTokenPrediction(query);
        console.log('result', result);

        if (result.error) {
          console.warn('Transformer prediction error:', result.error.message);
          setSuggestions([]);
          return;
        }

        // Return the ranked token list as suggestions
        const suggestions = result.rankedTokenList
          .filter(token => token && token.trim().length > 0)
          .slice(0, maxSuggestions);

        setSuggestions(suggestions);
      } catch (error) {
        console.error('Error predicting next word:', error);
        setSuggestions([]);
      }
    },
    [maxSuggestions, isReady]
  );

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
