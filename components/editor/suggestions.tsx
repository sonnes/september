'use client';

import { useEffect, useState } from 'react';

import { useMessagesContext } from '@/components/context/messages-provider';
import { useTextContext } from '@/components/context/text-provider';
import { PlayButton } from '@/components/talk/play-button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Suggestion } from '@/types/suggestion';

interface SuggestionsProps {
  className?: string;
  timeout?: number;
}

export default function Suggestions({ className = '', timeout = 500 }: SuggestionsProps) {
  const { text, setText } = useTextContext();
  const { messages } = useMessagesContext();
  const { showError } = useToast();

  const [debouncedText, setDebouncedText] = useState(text);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch suggestions from API
  const fetchSuggestions = async (text: string, messages: string[]) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, messages }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      setSuggestions(data.hits || []);
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
    fetchSuggestions(
      debouncedText,
      messages.map(m => m.text)
    );
  }, [debouncedText, messages]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedText(text);
    }, timeout);
    return () => clearTimeout(timeoutId);
  }, [text, timeout]);

  return (
    <div className={cn('flex flex-col gap-2 py-2 text-md', className)}>
      {isLoading && <div className="text-zinc-400 animate-pulse">Loading suggestions...</div>}
      {!isLoading && !suggestions.length && (
        <div className="text-zinc-400">No suggestions available</div>
      )}
      {!isLoading &&
        suggestions.slice(0, 10).map(({ text, audio_path }, index) => (
          <div
            className="flex items-center justify-between w-full gap-2"
            key={`suggestion-${index}`}
          >
            <button
              onClick={() => handleSuggestionClick(text)}
              className="px-4 py-2 text-sm font-medium text-black bg-white rounded-xl border border-blue-600 hover:bg-gray-100 hover:border-blue-400 transition-colors duration-200 text-left"
            >
              {text}
            </button>

            {audio_path && <PlayButton path={audio_path} />}
          </div>
        ))}
    </div>
  );
}
