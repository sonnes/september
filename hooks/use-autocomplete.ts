import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAccount } from '@/services/account/context';
import { useMessages } from '@/services/messages';

import { Autocomplete } from '@/lib/autocomplete';
import { tokenize } from '@/lib/autocomplete/utils';

// Cache for static data to avoid refetching
let cachedDictionary: any = null;
let cachedCorpus: string | null = null;
let isLoadingStaticData = false;

interface UseAutocompleteReturn {
  isReady: boolean;
  getSpellings: (query: string) => string[];
  getNextWords: (query: string) => string[];
}

export function useAutocomplete(): UseAutocompleteReturn {
  const { account } = useAccount();
  const { messages } = useMessages();
  const [autocomplete, setAutocomplete] = useState<Autocomplete>(new Autocomplete());
  const [isInitialized, setIsInitialized] = useState(false);

  const retrainAutocomplete = useCallback(() => {
    if (!cachedDictionary || !cachedCorpus) return;

    // Create training text with default data first, then user data
    const messagesText = messages.map(m => m.text).join('\n');
    const userCorpus = account?.ai_corpus || '';
    const trainingText = cachedCorpus + '\n' + userCorpus + '\n' + messagesText;

    const newAutocomplete = new Autocomplete();
    newAutocomplete.train(trainingText);
    setAutocomplete(newAutocomplete);
    setIsInitialized(true);
  }, [account, messages]);

  useEffect(() => {
    const loadData = async () => {
      try {
        let dictionary = cachedDictionary;
        let defaultCorpus = cachedCorpus;

        // Only fetch static data if not cached
        if (!dictionary || !defaultCorpus) {
          if (isLoadingStaticData) {
            // Wait for ongoing fetch to complete
            const checkCache = () => {
              if (cachedDictionary && cachedCorpus) {
                retrainAutocomplete();
              } else {
                setTimeout(checkCache, 100);
              }
            };
            checkCache();
            return;
          }

          isLoadingStaticData = true;
          try {
            const [dictResponse, corpusResponse] = await Promise.all([
              fetch('/dictionary.json'),
              fetch('/corpus.txt'),
            ]);

            dictionary = await dictResponse.json();
            defaultCorpus = await corpusResponse.text();

            // Cache the static data
            cachedDictionary = dictionary;
            cachedCorpus = defaultCorpus;
          } finally {
            isLoadingStaticData = false;
          }
        }

        retrainAutocomplete();
      } catch (error) {
        console.warn('Failed to load default dictionary/corpus, using fallback:', error);
        // Fallback to user data only if default loading fails
        if (account?.ai_corpus || messages.length) {
          const messagesText = messages.map(m => m.text).join('\n');
          const trainingText = (account?.ai_corpus || '') + '\n' + messagesText;
          const newAutocomplete = new Autocomplete();
          newAutocomplete.train(trainingText);
          setAutocomplete(newAutocomplete);
        }
        setIsInitialized(true);
      }
    };

    loadData();
  }, [retrainAutocomplete]);

  const getSpellings = useCallback(
    (query: string) => {
      if (!query || query.trim().length === 0 || !autocomplete.isReady()) {
        return [];
      }

      const tokens = tokenize(query);
      const lastToken = tokens[tokens.length - 1];

      const spellings = autocomplete.getCompletions(lastToken) || [];

      return spellings.map(spelling => spelling.toLowerCase());
    },
    [autocomplete]
  );

  const getNextWords = useCallback(
    (query: string) => {
      if (!query || query.trim().length < 1 || !autocomplete.isReady()) {
        return [];
      }

      const tokens = tokenize(query);
      const last3Tokens = tokens.slice(-3).join(' ');

      const nextWords = autocomplete.getNextWord(last3Tokens) || [];

      return nextWords;
    },
    [autocomplete]
  );

  return {
    isReady: isInitialized && autocomplete.isReady(),
    getSpellings,
    getNextWords,
  };
}
