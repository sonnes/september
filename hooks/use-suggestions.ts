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
  const { showError } = useToast();

  const [debouncedText, setDebouncedText] = useState(text);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const gemini = new GeminiService(account?.gemini_api_key || '');
  const messagesService = new MessagesService(supabase);

  const fetchAISuggestions = useCallback(
    async (text: string, messages: Partial<Message>[]) => {
      if (!account?.gemini_api_key) {
        return;
      }

      try {
        const suggestions = await gemini.generateSuggestions({
          instructions: account?.ai_instructions || '',
          text,
          messages,
        });

        return suggestions.suggestions.map(text => ({ text, audio_path: undefined }));
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        showError('Failed to fetch suggestions');
        return [];
      }
    },
    [account]
  );

  const searchMessages = useCallback(
    async (text: string) => {
      const messages = await messagesService.searchMessages(account.id, text);
      return messages.map(message => ({
        text: message.text,
        audio_path: message.audio_path,
      }));
    },
    [account]
  );

  const fetchSuggestions = useCallback(
    async (text: string, messages: Partial<Message>[]) => {
      setIsLoading(true);

      const [hits, suggestions] = await Promise.all([
        searchMessages(text),
        fetchAISuggestions(text, messages),
      ]);

      const results = [...hits, ...(suggestions || [])];

      setSuggestions(results);
      setIsLoading(false);
    },
    [searchMessages, fetchAISuggestions]
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
