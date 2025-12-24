'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAccountContext } from '@/packages/account';
import { useMessages } from '@/packages/chats';

import { Autocomplete } from '@/lib/autocomplete';
import { tokenize } from '@/lib/autocomplete/utils';

// Cache for static data to avoid refetching
let cachedDictionary: Record<string, number> | null = null;
let cachedCorpus: string | null = null;
let isLoadingStaticData = false;

interface UseAutocompleteOptions {
  includeMessages?: boolean;
}

interface UseAutocompleteReturn {
  isReady: boolean;
  getSpellings: (query: string) => string[];
  getNextWords: (query: string) => string[];
}

export function useAutocomplete(options: UseAutocompleteOptions = {}): UseAutocompleteReturn {
  const { includeMessages = false } = options;
  const { account } = useAccountContext();
  const { messages } = useMessages();
  const [autocomplete, setAutocomplete] = useState<Autocomplete>(new Autocomplete());
  const [isInitialized, setIsInitialized] = useState(false);

  const retrainAutocomplete = useCallback(() => {
    if (!cachedDictionary || !cachedCorpus) return;

    // Create training text with default data first, then user data
    const userCorpus = account?.ai_suggestions?.settings?.ai_corpus || '';
    let trainingText = cachedCorpus + '\n' + userCorpus;

    // Optionally include message history
    if (includeMessages && messages.length > 0) {
      const messagesText = messages.map(m => m.text).join('\n');
      trainingText += '\n' + messagesText;
    }

    const newAutocomplete = new Autocomplete();
    newAutocomplete.train(trainingText);
    setAutocomplete(newAutocomplete);
    setIsInitialized(true);
  }, [account, messages, includeMessages]);

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
        if (account?.ai_suggestions?.settings?.ai_corpus || (includeMessages && messages.length)) {
          let trainingText = account?.ai_suggestions?.settings?.ai_corpus || '';
          if (includeMessages && messages.length > 0) {
            const messagesText = messages.map(m => m.text).join('\n');
            trainingText += '\n' + messagesText;
          }
          const newAutocomplete = new Autocomplete();
          newAutocomplete.train(trainingText);
          setAutocomplete(newAutocomplete);
        }
        setIsInitialized(true);
      }
    };

    loadData();
  }, [retrainAutocomplete, account?.ai_suggestions?.settings?.ai_corpus, includeMessages, messages]);

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
