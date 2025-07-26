'use client';

import { useEffect, useState } from 'react';

import { useMessagesContext } from '@/components/context/messages-provider';
import { useTextContext } from '@/components/context/text-provider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SuggestionsProps {
  className?: string;
}

export default function Suggestions({ className = '' }: SuggestionsProps) {
  const { text, setText } = useTextContext();
  const { messages } = useMessagesContext();
  const { showError } = useToast();

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch suggestions from API
  const fetchSuggestions = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, messages: messages.map(m => m.text) }),
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
    setText(suggestion);
  };

  useEffect(() => {
    fetchSuggestions();
  }, [text, messages]);

  return (
    <div className={cn('flex flex-col gap-2 py-2 text-md', className)}>
      {isLoading && <div className="text-zinc-400 animate-pulse">Loading suggestions...</div>}
      {!isLoading && !suggestions.length && (
        <div className="text-zinc-400">No suggestions available</div>
      )}
      {suggestions.slice(0, 10).map((suggestion, index) => (
        <button
          key={index}
          onClick={() => handleSuggestionClick(suggestion)}
          className="px-4 py-2 text-sm font-medium text-black bg-white rounded-xl border border-blue-600 hover:bg-gray-100 hover:border-blue-400 transition-colors duration-200 text-left"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
