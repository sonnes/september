'use client';

import { useMemo, useState } from 'react';

import { Suggestion, Suggestions } from '@/packages/ui';

import { useAutocomplete } from '../hooks/use-autocomplete';

import { MATCH_PUNCTUATION } from '@/packages/shared';
import { useEditorContext } from './editor-provider';

export function Autocomplete() {
  const { text, addWord, setCurrentWord, chatId } = useEditorContext();
  const { isReady, getSpellings, getNextWords } = useAutocomplete({
    includeMessages: true,
    chatId,
  });

  const [dismissedText, setDismissedText] = useState<string | null>(null);

  // Check if text ends with space or punctuation (trigger for phrase prediction)
  const shouldTriggerPhrasePrediction = (text: string) => {
    const lastChar = text.slice(-1);
    if (lastChar.match(MATCH_PUNCTUATION) || lastChar === ' ') {
      return true;
    }

    return false;
  };

  // Update suggestions when text changes
  const words = useMemo(() => {
    if (!isReady || text === dismissedText) return [];

    if (shouldTriggerPhrasePrediction(text)) {
      return getNextWords(text);
    } else {
      return getSpellings(text);
    }
  }, [text, isReady, getSpellings, getNextWords, dismissedText]);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    if (shouldTriggerPhrasePrediction(text)) {
      addWord(suggestion);
    } else {
      setCurrentWord(suggestion);
    }

    setDismissedText(text);
  };

  // Self-hide when there's nothing to predict, so the row leaves no empty gap.
  if (words.length === 0) return null;

  return (
    <Suggestions>
      {words.map(word => (
        <Suggestion key={word} onClick={handleSuggestionClick} suggestion={word} size="default" />
      ))}
    </Suggestions>
  );
}
