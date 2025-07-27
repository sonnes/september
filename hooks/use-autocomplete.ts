import { useCallback, useEffect, useRef, useState } from 'react';

import { useAccountContext } from '@/components/context/account-provider';
import { useMessagesContext } from '@/components/context/messages-provider';
import Transformer from '@/lib/transformer';
import { tokenize } from '@/lib/transformer/text';

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

  const { account } = useAccountContext();
  const { messages } = useMessagesContext();

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
          (async () => {
            if (!transformerRef.current) {
              transformerRef.current = new Transformer();

              const messagesText = messages.map(m => m.text).join('\n');

              await transformerRef.current.train({
                name: 'test',
                text: (account?.ai_corpus || '') + '\n' + messagesText,
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
  }, [account?.ai_corpus]);

  const getSuggestions = useCallback(
    async (query: string) => {
      if (!query || query.trim().length < minQueryLength) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);

      try {
        console.log('query', query);
        const results = await transformerRef.current?.getAutocompleteSuggestions(query);
        console.log('results', results);
        setSuggestions(results || []);
      } catch (error) {
        console.error('Error getting suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [isReady]
  );

  const predictNextWord = useCallback(
    async (query: string) => {
      if (!transformerRef.current || !isReady) {
        setSuggestions([]);
        return;
      }

      try {
        const tokens = tokenize(query);
        const result = transformerRef.current.getTokenPrediction(tokens[tokens.length - 1]);
        console.log('result', result);
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
