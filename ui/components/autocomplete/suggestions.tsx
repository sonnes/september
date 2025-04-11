import { useEffect, useState } from 'react';

import { Button } from '@/components/catalyst/button';
import { useDebounce } from '@/hooks/useDebounce';

import { MarkovChain } from './markov';

interface SuggestionsProps {
  text: string;
  onSelect: (text: string) => void;
  debounceMs?: number;
}

const markov = MarkovChain.getInstance();
markov.initializeCSV('/corpus.csv');
markov.initializeCSV('/ngsl.csv');

export default function Suggestions({ text, onSelect, debounceMs = 300 }: SuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const debouncedText = useDebounce(text, debounceMs);

  const fetchSuggestion = async (text: string) => {
    if (!text) return;

    const suggestions = markov.getSuggestions(text, 10);
    setSuggestions(suggestions);
  };

  useEffect(() => {
    if (debouncedText) {
      fetchSuggestion(debouncedText);
    } else {
      setSuggestions([]);
    }
  }, [debouncedText]);

  return (
    <div className="mb-2 min-h-[52px]">
      {suggestions && suggestions.length > 0 ? (
        <div className="flex overflow-x-auto scrollbar gap-2">
          {suggestions.map((completion, index) => (
            <button
              key={index}
              onClick={() => onSelect(completion)}
              className="p-2 text-md font-medium rounded-md border border-zinc-200 hover:bg-zinc-100"
            >
              {completion}
            </button>
          ))}
        </div>
      ) : (
        <div className="p-2" />
      )}
    </div>
  );
}
