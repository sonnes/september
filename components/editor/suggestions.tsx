'use client';

import { useEffect } from 'react';

import { useAutocomplete } from '@/hooks/use-autocomplete';
import { useTextContext } from '@/hooks/use-text-context';

interface SuggestionsProps {
  className?: string;
}

export default function Suggestions({ className = '' }: SuggestionsProps) {
  const { debouncedText, completeWord, addWord } = useTextContext();
  const { suggestions, isLoading, isReady, getSuggestions, clearSuggestions, predictNextWord } =
    useAutocomplete({
      maxSuggestions: 10,
      minQueryLength: 1,
    });

  // Check if text ends with space or punctuation (trigger for phrase prediction)
  const shouldTriggerPhrasePrediction = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return true;

    // Trigger after space at the end or after punctuation followed by space
    return text.endsWith(' ') || /[.!?]\s*$/.test(text);
  };

  // Get context for phrase prediction (last few words)
  const getPhraseContext = (text: string) => {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);

    // Take last 3-5 words as context, depending on what's available
    const contextLength = Math.min(5, Math.max(1, words.length));
    return words.slice(-contextLength).join(' ');
  };

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

    console.log('debouncedText', debouncedText);
    if (shouldTriggerPhrasePrediction(debouncedText)) {
      const context = getPhraseContext(debouncedText);
      if (context) {
        predictNextWord(context);
      } else {
        clearSuggestions();
      }
    } else {
      const lastWord = getLastWord(debouncedText);
      if (lastWord) {
        getSuggestions(lastWord);
      } else {
        clearSuggestions();
      }
    }
  }, [debouncedText, isReady, getSuggestions, clearSuggestions]);

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
