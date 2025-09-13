import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAccount } from '@/services/account/context';
import { useMessages } from '@/services/messages';

import { Autocomplete } from '@/lib/autocomplete';

interface UseAutocompleteReturn {
  isReady: boolean;
  getSpellings: (query: string) => string[];
  getNextWords: (query: string) => string[];
}

export function useAutocomplete(): UseAutocompleteReturn {
  const { account } = useAccount();
  const { messages } = useMessages();

  const autocomplete = useMemo(() => {
    const autocomplete = new Autocomplete();
    if (!account?.ai_corpus && !messages.length) {
      return autocomplete;
    }

    const messagesText = messages.map(m => m.text).join('\n');
    const trainingText = (account?.ai_corpus || '') + '\n' + messagesText;

    autocomplete.train(trainingText);

    return autocomplete;
  }, [account, messages]);

  const getSpellings = useCallback(
    (query: string) => {
      if (!query || query.trim().length === 0 || !autocomplete.isReady()) {
        return [];
      }

      const spellings = autocomplete.getCompletions(query) || [];

      return spellings.map(spelling => spelling.toLowerCase());
    },
    [autocomplete]
  );

  const getNextWords = useCallback(
    (query: string) => {
      if (!query || query.trim().length < 1 || !autocomplete.isReady()) {
        return [];
      }

      const nextWords = autocomplete.getNextWord(query) || [];

      return nextWords;
    },
    [autocomplete]
  );

  return {
    isReady: autocomplete.isReady(),
    getSpellings,
    getNextWords,
  };
}
