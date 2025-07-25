'use client';

import { useEffect } from 'react';

import { useAutocomplete } from '@/hooks/use-autocomplete';
import { useTextContext } from '@/hooks/use-text-context';
import { MATCH_PUNCTUATION } from '@/lib/transformer/text';

interface SuggestionsProps {
  className?: string;
}

export default function Suggestions({ className = '' }: SuggestionsProps) {
  const { text, completeWord, addWord } = useTextContext();
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
    const lastChar = text.slice(-1);

    if (lastChar.match(MATCH_PUNCTUATION) || lastChar === ' ') {
      completeWord(suggestion);
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
    <div className={`flex flex-wrap gap-2 p-2 text-md ${className}`}>
      {!isReady && <div className="text-zinc-400 animate-pulse">Loading suggestions...</div>}
      {isReady && !isLoading && !suggestions.length && (
        <div className="text-zinc-400">No suggestions</div>
      )}
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => handleSuggestionClick(suggestion)}
          className="px-3 py-2 text-md bg-transparent hover:bg-amber-100 text-zinc-800 rounded-lg border border-zinc-600 transition-colors duration-200"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
