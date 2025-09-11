import { useCallback, useEffect, useRef, useState } from 'react';

import { Autocomplete } from '@/lib/autocomplete';
import { useAccount } from '@/services/account/context';
import { useMessages } from '@/services/messages';

interface UseAutocompleteReturn {
  words: string[];
  phrases: string[];
  isLoading: boolean;
  isReady: boolean;
  getSuggestions: (query: string) => void;
  predictNextWord: (query: string) => void;
  predictNextPhrase: (query: string) => void;
  clearSuggestions: () => void;
}

export function useAutocomplete(): UseAutocompleteReturn {
  const { account } = useAccount();
  const { messages } = useMessages();

  const [words, setWords] = useState<string[]>([]);
  const [phrases, setPhrases] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const autocompleteRef = useRef<Autocomplete | null>(null);

  // Initialize service on mount
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize TypingSuggestions service
        if (!autocompleteRef.current) {
          autocompleteRef.current = new Autocomplete();

          const messagesText = messages.map(m => m.text).join('\n');
          const trainingText = (account?.ai_corpus || '') + '\n' + messagesText;

          // Train the service with the combined text
          autocompleteRef.current.train(trainingText);
        }

        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize TypingSuggestions service:', error);
      }
    };

    initializeServices();
  }, [account?.ai_corpus, messages]);

  const getSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 1) {
      setWords([]);
      return;
    }

    setIsLoading(true);

    try {
      if (autocompleteRef.current && autocompleteRef.current.isReady()) {
        const results = autocompleteRef.current.getCompletions(query);
        setWords(results.slice(0, 10));
      } else {
        setWords([]);
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
      setWords([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const predictNextWord = useCallback(async (query: string) => {
    if (!autocompleteRef.current || !autocompleteRef.current.isReady()) {
      setWords([]);
      return;
    }

    try {
      // Get next word predictions using the context
      const predictions = autocompleteRef.current.getNextWord(query);

      // Return the top predictions as suggestions
      const suggestions = predictions.filter(word => word && word.trim().length > 0).slice(0, 10);

      setWords(suggestions);
    } catch (error) {
      console.error('Error predicting next word:', error);
      setWords([]);
    }
  }, []);

  const predictNextPhrase = useCallback(async (query: string) => {
    if (!autocompleteRef.current || !autocompleteRef.current.isReady()) {
      setPhrases([]);
      return;
    }

    try {
      const predictions = autocompleteRef.current.getNextPhrase(query);
      setPhrases(predictions.slice(0, 10));
    } catch (error) {
      console.error('Error predicting next phrase:', error);
      setPhrases([]);
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setWords([]);
    setPhrases([]);
  }, []);

  return {
    words,
    phrases,
    isLoading,
    isReady,
    getSuggestions,
    predictNextWord,
    predictNextPhrase,
    clearSuggestions,
  };
}
