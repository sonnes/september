'use client';

import { useEffect, useState } from 'react';

import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';

import { MATCH_PUNCTUATION } from '@/lib/utils';

import { useEditorContext } from '@/packages/editor/components/editor-provider';
import { useAutocomplete } from '@/packages/editor/hooks/use-autocomplete';

export function Autocomplete() {
  const { text, addWord, setCurrentWord } = useEditorContext();
  const { isReady, getSpellings, getNextWords } = useAutocomplete();

  const [words, setWords] = useState<string[]>([]);

  // Check if text ends with space or punctuation (trigger for phrase prediction)
  const shouldTriggerPhrasePrediction = (text: string) => {
    const lastChar = text.slice(-1);
    if (lastChar.match(MATCH_PUNCTUATION) || lastChar === ' ') {
      return true;
    }

    return false;
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    if (shouldTriggerPhrasePrediction(text)) {
      addWord(suggestion);
    } else {
      setCurrentWord(suggestion);
    }

    setWords([]);
  };

  // Update suggestions when text changes
  useEffect(() => {
    if (!isReady) return;

    if (shouldTriggerPhrasePrediction(text)) {
      const words = getNextWords(text);
      setWords(words);
    } else {
      const words = getSpellings(text);
      setWords(words);
    }
  }, [text, isReady, getSpellings, getNextWords]);

  return (
    <Suggestions>
      {words.map(word => (
        <Suggestion key={word} onClick={handleSuggestionClick} suggestion={word} size="default" />
      ))}
    </Suggestions>
  );
}
