'use client';

import { useEffect } from 'react';

import { useTextContext } from '@/components/context/text-provider';
import { useAutocomplete } from '@/hooks/use-autocomplete';
import { MATCH_PUNCTUATION } from '@/lib/transformer/text';
import { cn } from '@/lib/utils';

interface AutocompleteProps {
  className?: string;
}

export default function Autocomplete({ className = '' }: AutocompleteProps) {
  const { text, addWord, setCurrentWord } = useTextContext();
  const { suggestions, isLoading, isReady, getSuggestions, clearSuggestions, predictNextWord } =
    useAutocomplete({
      maxSuggestions: 10,
      minQueryLength: 1,
    });

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
      setCurrentWord(suggestion);
    } else {
      addWord(suggestion);
    }
    clearSuggestions();
  };

  // Update suggestions when text changes
  useEffect(() => {
    if (!isReady) return;

    if (shouldTriggerPhrasePrediction(text)) {
      console.log('next word', text);
      predictNextWord(text);
    } else {
      console.log('suggestions', text);
      getSuggestions(text);
    }
  }, [text, isReady, getSuggestions, clearSuggestions]);

  return (
    <div className={cn('flex flex-wrap gap-2 py-2 text-md min-h-[60px] items-center', className)}>
      {!isReady && <div className="text-zinc-400 animate-pulse">Loading suggestions...</div>}
      {isReady && !isLoading && !suggestions.length && (
        <div className="text-zinc-400">No suggestions</div>
      )}
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => handleSuggestionClick(suggestion)}
          className="px-4 py-2 text-sm font-medium text-black bg-white rounded-xl border border-green-600 hover:bg-gray-100 hover:border-green-400 transition-colors duration-200"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
