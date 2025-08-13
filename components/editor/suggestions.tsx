'use client';

import { useCallback, useEffect, useState } from 'react';

import { useMessagesContext } from '@/components/context/messages-provider';
import { useTextContext } from '@/components/context/text-provider';
import { PlayButton } from '@/components/talk/play-button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import GeminiService from '@/services/gemini';
import { Message } from '@/types/message';
import { Suggestion } from '@/types/suggestion';

import { useAccountContext } from '../context/account-provider';

interface SuggestionsProps {
  className?: string;
  timeout?: number;
}

export default function Suggestions({ className = '', timeout = 3000 }: SuggestionsProps) {
  const { text, setText } = useTextContext();
  const { messages } = useMessagesContext();
  const { account } = useAccountContext();
  const { showError } = useToast();

  const [debouncedText, setDebouncedText] = useState(text);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const gemini = new GeminiService(account?.gemini_api_key || '');

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(
    async (text: string, messages: Partial<Message>[]) => {
      if (!account?.gemini_api_key) {
        return;
      }

      setIsLoading(true);

      const suggestions = await gemini.generateSuggestions({
        instructions: account?.ai_instructions || '',
        text,
        messages,
      });

      setSuggestions(suggestions.suggestions.map(text => ({ text, audio_path: undefined })));

      setIsLoading(false);
    },
    [account]
  );

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setText(suggestion);
  };

  useEffect(() => {
    if (text.trim().length === 0) return;

    fetchSuggestions(
      debouncedText,
      messages.slice(0, 5).map(m => ({ text: m.text, type: m.type }))
    );
  }, [debouncedText, messages]);

  useEffect(() => {
    if (text.trim().length === 0) return;

    const timeoutId = setTimeout(() => {
      setDebouncedText(text);
    }, timeout);
    return () => clearTimeout(timeoutId);
  }, [text, timeout]);

  return (
    <div className={cn('flex flex-col gap-2 py-2 text-md', className)}>
      {isLoading && <div className="text-zinc-400 animate-pulse">Loading suggestions...</div>}
      {!isLoading && !suggestions.length && <div className="text-zinc-400"></div>}
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
