import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/catalyst/input";
import type { Message } from "@/db/messages";

interface MarkovChainAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  debounceMs?: number;
  history?: Message[];
}

type MarkovChain = {
  [key: string]: string[];
};

function buildMarkovChain(texts: string[]): MarkovChain {
  const chain: MarkovChain = {};

  texts.forEach((text) => {
    const words = text.split(" ");

    for (let i = 0; i < words.length - 1; i++) {
      const currentWord = words[i].toLowerCase();
      const nextWord = words[i + 1];

      if (!chain[currentWord]) {
        chain[currentWord] = [];
      }
      chain[currentWord].push(nextWord);
    }
  });

  return chain;
}

function generateSuggestions(
  chain: MarkovChain,
  currentWord: string,
  maxSuggestions: number = 5
): string[] {
  const lastWord = currentWord.split(" ").pop()?.toLowerCase() || "";
  const suggestions = chain[lastWord] || [];

  // Get unique suggestions
  const uniqueSuggestions = Array.from(new Set(suggestions));

  // Return full phrases by combining current input with suggestions
  return uniqueSuggestions
    .slice(0, maxSuggestions)
    .map((suggestion) => `${currentWord} ${suggestion}`);
}

export default function MarkovChainAutocomplete({
  value,
  onChange,
  onSubmit,
  history = [],
  placeholder = "Type something...",
  debounceMs = 300,
}: MarkovChainAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [markovChain, setMarkovChain] = useState<MarkovChain>({});

  // Build Markov chain from history
  useEffect(() => {
    const texts = history.map((msg) => msg.text);
    const chain = buildMarkovChain(texts);
    setMarkovChain(chain);
  }, [history]);

  // Generate suggestions when value changes
  useEffect(() => {
    if (value.trim()) {
      const newSuggestions = generateSuggestions(markovChain, value.trim());
      setSuggestions(newSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [value, markovChain]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="w-full">
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="px-3 py-1 text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-full transition-colors"
              onClick={() => onChange(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full"
      />
    </div>
  );
}
