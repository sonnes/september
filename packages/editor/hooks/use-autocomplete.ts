'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAccountContext } from '@/packages/account';

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
  const { account } = useAccountContext();
  const [autocomplete, setAutocomplete] = useState<Autocomplete>(new Autocomplete());
  const [isInitialized, setIsInitialized] = useState(false);

  const retrainAutocomplete = useCallback(() => {
    if (!cachedDictionary || !cachedCorpus) return;

    // Create training text with default data first, then user data
    const userCorpus = account?.ai_corpus || '';
    const trainingText = cachedCorpus + '\n' + userCorpus;

    const newAutocomplete = new Autocomplete();
    newAutocomplete.train(trainingText);
    setAutocomplete(newAutocomplete);
    setIsInitialized(true);
  }, [account]);

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
        if (account?.ai_corpus) {
          const trainingText = account?.ai_corpus || '';
          const newAutocomplete = new Autocomplete();
          newAutocomplete.train(trainingText);
          setAutocomplete(newAutocomplete);
        }
        setIsInitialized(true);
      }
    };

    loadData();
  }, [retrainAutocomplete, account?.ai_corpus]);

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
      if (!query || !autocomplete.isReady()) {
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
