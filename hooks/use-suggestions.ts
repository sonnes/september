import { useCallback, useEffect, useState } from 'react';

import { useTextContext } from '@/components/context/text-provider';

import { useToast } from '@/hooks/use-toast';

import { useAccount } from '@/services/account/context';
import GeminiService from '@/services/gemini';
import { MessagesService, useMessages } from '@/services/messages';

import supabase from '@/supabase/client';
import { Message } from '@/types/message';
import { Suggestion } from '@/types/suggestion';

interface UseSuggestionsReturn {
  suggestions: Suggestion[];
  isLoading: boolean;
  fetchSuggestions: (text: string, messages: Partial<Message>[]) => Promise<void>;
  clearSuggestions: () => void;
}

export function useSuggestions(timeout: number = 3000): UseSuggestionsReturn {
  const { text } = useTextContext();
  const { messages } = useMessages();
  const { account } = useAccount();

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [debouncedText, setDebouncedText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);

  const gemini = new GeminiService(account?.gemini_api_key || '');

  const fetchSuggestions = useCallback(
    async (text: string, messages: Partial<Message>[]) => {
      if (!account?.gemini_api_key) {
        return;
      }

      setIsLoading(true);

      try {
        const suggestions = await gemini.generateSuggestions({
          instructions: account?.ai_instructions || '',
          text,
          messages,
        });

        setSuggestions(suggestions.suggestions.map(text => ({ text, audio_path: undefined })));
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setIsLoading(false);
      }
    },
    [account]
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Auto-fetch suggestions when debounced text changes
  useEffect(() => {
    if (text.trim().length === 0) return;

    fetchSuggestions(
      debouncedText,
      messages.slice(0, 5).map(m => ({ text: m.text, type: m.type }))
    );
  }, [debouncedText, messages, fetchSuggestions]);

  // Debounce text changes
  useEffect(() => {
    if (text.trim().length === 0) return;

    const timeoutId = setTimeout(() => {
      setDebouncedText(text);
    }, timeout);
    return () => clearTimeout(timeoutId);
  }, [text, timeout]);

  return {
    suggestions,
    isLoading,
    fetchSuggestions,
    clearSuggestions,
  };
}

interface UseSearchHistoryReturn {
  history: Suggestion[];
  isLoading: boolean;
  fetchHistory: (text: string, messages: Partial<Message>[]) => Promise<void>;
}

export function useSearchHistory(timeout: number = 3000): UseSearchHistoryReturn {
  const { text } = useTextContext();
  const { searchMessages } = useMessages();

  const [history, setHistory] = useState<Suggestion[]>([]);
  const [debouncedText, setDebouncedText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = useCallback(
    async (text: string) => {
      setIsLoading(true);

      const history = await searchMessages(text);
      setHistory(history.map(m => ({ text: m.text, audio_path: m.audio_path })));
      setIsLoading(false);
    },
    [searchMessages]
  );

  useEffect(() => {
    if (text.trim().length === 0) return;
    fetchHistory(debouncedText);
  }, [debouncedText, fetchHistory]);

  useEffect(() => {
    if (text.trim().length === 0) return;

    const timeoutId = setTimeout(() => {
      setDebouncedText(text);
    }, timeout);
    return () => clearTimeout(timeoutId);
  }, [text]);

  return {
    history,
    isLoading,
    fetchHistory,
  };
}
