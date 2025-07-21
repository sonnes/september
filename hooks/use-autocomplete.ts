import { useCallback, useEffect, useRef, useState } from 'react';

import autocompleteService from '@/services/autocomplete';

interface UseAutocompleteOptions {
  maxSuggestions?: number;
  minQueryLength?: number;
  debounceMs?: number;
}

interface UseAutocompleteReturn {
  suggestions: string[];
  isLoading: boolean;
  isReady: boolean;
  getSuggestions: (query: string) => void;
  clearSuggestions: () => void;
}

export function useAutocomplete(options: UseAutocompleteOptions = {}): UseAutocompleteReturn {
  const { maxSuggestions = 5, minQueryLength = 2, debounceMs = 300 } = options;

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const debouncedGetSuggestions = useCallback(
    (query: string) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      const timer = setTimeout(() => {
        getSuggestions(query);
      }, debounceMs);

      debounceTimerRef.current = timer;
    },
    [getSuggestions, debounceMs]
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    suggestions,
    isLoading,
    isReady,
    getSuggestions: debouncedGetSuggestions,
    clearSuggestions,
  };
}
