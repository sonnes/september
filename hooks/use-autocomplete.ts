import { useCallback, useEffect, useRef, useState } from 'react';

import { TypingSuggestions } from '@/lib/autocomplete';
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

  const typingSuggestionsRef = useRef<TypingSuggestions | null>(null);

  // Initialize service on mount
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize TypingSuggestions service
        if (!typingSuggestionsRef.current) {
          typingSuggestionsRef.current = new TypingSuggestions();

          const messagesText = messages.map(m => m.text).join('\n');
          const trainingText = (account?.ai_corpus || '') + '\n' + messagesText;

          // Train the service with the combined text
          typingSuggestionsRef.current.train(trainingText);
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
      if (typingSuggestionsRef.current && typingSuggestionsRef.current.isReady()) {
        const results = typingSuggestionsRef.current.getCompletions(query);
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
    if (!typingSuggestionsRef.current || !typingSuggestionsRef.current.isReady()) {
      setWords([]);
      return;
    }

    try {
      // Get next word predictions using the context
      const predictions = typingSuggestionsRef.current.getNextWord(query);

      // Return the top predictions as suggestions
      const suggestions = predictions.filter(word => word && word.trim().length > 0).slice(0, 10);

      setWords(suggestions);
    } catch (error) {
      console.error('Error predicting next word:', error);
      setWords([]);
    }
  }, []);

  const predictNextPhrase = useCallback(async (query: string) => {
    if (!typingSuggestionsRef.current || !typingSuggestionsRef.current.isReady()) {
      setPhrases([]);
      return;
    }

    try {
      const predictions = typingSuggestionsRef.current.getNextPhrase(query);
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
