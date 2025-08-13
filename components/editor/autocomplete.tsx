'use client';

import { useEffect } from 'react';

import { useTextContext } from '@/components/context/text-provider';
import { useAutocomplete } from '@/hooks/use-autocomplete';
import { MATCH_PUNCTUATION, cn } from '@/lib/utils';

interface AutocompleteProps {
  className?: string;
}

export default function Autocomplete({ className = '' }: AutocompleteProps) {
  const { text, addWord, setCurrentWord } = useTextContext();
  const {
    words,
    phrases,
    isLoading,
    isReady,
    getSuggestions,
    clearSuggestions,
    predictNextWord,
    predictNextPhrase,
  } = useAutocomplete();

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
    clearSuggestions();
  };

  // Update suggestions when text changes
  useEffect(() => {
    if (!isReady) return;

    if (shouldTriggerPhrasePrediction(text)) {
      predictNextWord(text);
    } else {
      getSuggestions(text);
    }

    predictNextPhrase(text);
  }, [text, isReady, getSuggestions, clearSuggestions, predictNextWord, predictNextPhrase]);

  return (
    <>
      <div className={cn('flex flex-wrap gap-2 py-2 text-md min-h-[60px] items-center', className)}>
        {!isReady && <div className="text-zinc-400 animate-pulse">Loading suggestions...</div>}
        {isReady && !isLoading && !words.length && <div className="text-zinc-400"></div>}
        {words.map((word, index) => (
          <button
            key={index}
            onClick={() => handleSuggestionClick(word)}
            className="px-4 py-2 text-sm font-medium text-black bg-white rounded-xl border border-green-600 hover:bg-gray-100 hover:border-green-400 transition-colors duration-200"
          >
            {word}
          </button>
        ))}
      </div>
      <div className={cn('flex flex-wrap gap-2 py-2 text-md min-h-[60px] items-center', className)}>
        {phrases.map((phrase, index) => (
          <button
            key={index}
            onClick={() => handleSuggestionClick(phrase)}
            className="px-4 py-2 text-sm font-medium text-black bg-white rounded-xl border border-green-600 hover:bg-gray-100 hover:border-green-400 transition-colors duration-200"
          >
            {phrase}
          </button>
        ))}
      </div>
    </>
  );
}
