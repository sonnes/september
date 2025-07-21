'use client';

import { useEffect } from 'react';

import { useAutocomplete } from '@/hooks/use-autocomplete';
import { useTextContext } from '@/hooks/use-text-context';

interface SuggestionsProps {
  className?: string;
}

export default function Suggestions({ className = '' }: SuggestionsProps) {
  const { text, completeWord } = useTextContext();
  const { suggestions, isLoading, isReady, getSuggestions, clearSuggestions } = useAutocomplete({
    maxSuggestions: 10,
    minQueryLength: 1,
    debounceMs: 300,
  });

  // Get the last word being typed
  const getLastWord = (text: string) => {
    if (text.endsWith(' ')) {
      return '';
    }

    const words = text.trim().split(/\s+/);
    return words[words.length - 1] || '';
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    completeWord(suggestion);
    clearSuggestions();
  };

  // Update suggestions when text changes
  useEffect(() => {
    if (!isReady) return;

    const lastWord = getLastWord(text);

    console.log(lastWord);
    if (!lastWord) {
      clearSuggestions();
    } else {
      getSuggestions(lastWord);
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
