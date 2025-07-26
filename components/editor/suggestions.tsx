'use client';

import { useEffect, useState } from 'react';

import { useTextContext } from '@/hooks/use-text-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/message';

interface SuggestionsProps {
  className?: string;
}

export default function Suggestions({ className = '' }: SuggestionsProps) {
  const { text, addWord } = useTextContext();
  const { showError } = useToast();

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch suggestions from API
  const fetchSuggestions = async () => {
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      showError('Failed to load suggestions');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    addWord(suggestion);
  };

  useEffect(() => {
    fetchSuggestions();
  }, [text]);

  return (
    <div className={cn('flex flex-wrap gap-2 py-2 text-md min-h-[60px] items-center', className)}>
      {isLoading && <div className="text-zinc-400 animate-pulse">Loading suggestions...</div>}
      {!isLoading && !suggestions.length && (
        <div className="text-zinc-400">No suggestions available</div>
      )}
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => handleSuggestionClick(suggestion)}
          className="px-4 py-2 text-sm font-medium text-black bg-white rounded-xl border border-blue-600 hover:bg-gray-100 hover:border-blue-400 transition-colors duration-200"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
