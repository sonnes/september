'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

import { useDebounce } from '@/hooks/use-debounce';

import { useAISettings } from '@/packages/ai';
import { Message } from '@/packages/chats';
import { Suggestion } from '@/packages/suggestions/types';

const SUGGESTIONS_PROMPT = `You are a predictive text assistant for the User in a conversation with a Partner.
Generate 5 contextual suggestions that the User would likely say next.

<persona>
{USER_PERSONA}
</persona>

Rules:
1. Suggestions must be complete, standalone sentences.
2. If the User is typing, suggestions should complete or naturally extend their current thought.
3. If the User is not typing, provide relevant responses to the Partner or new conversation starters.
4. Match the User's persona, tone, and communication style.
5. Return ONLY a JSON array of 5 strings.

Examples:
- Partner: "What time?" | User (typing): "6" -> ["6 PM works for me", "I'll be there by 6", "Around 6:30?", "I'm free after 6", "Let's meet at 6"]
- Partner: "How are you?" | User (typing): "" -> ["I'm doing well, thanks!", "Good, how about you?", "Not too bad, just busy.", "Great! Excited for today", "I'm okay, hanging in there"]`;

interface UseSuggestionsReturn {
  suggestions: Suggestion[];
  isLoading: boolean;
  clearSuggestions: () => void;
}

export function useSuggestions({
  text,
  timeout = 2000,
  history = [],
}: {
  text: string;
  timeout?: number;
  history?: Message[];
}): UseSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const debouncedText = useDebounce(text, timeout);
  const [isLoading, setIsLoading] = useState(false);

  const { getProviderConfig, suggestionsConfig } = useAISettings();

  const providerConfig = useMemo(
    () => getProviderConfig(suggestionsConfig.provider),
    [getProviderConfig, suggestionsConfig.provider]
  );

  const apiKey = providerConfig?.api_key;

  const google = useMemo(
    () =>
      createGoogleGenerativeAI({
        apiKey: apiKey || '',
      }),
    [apiKey]
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Auto-fetch suggestions when debounced text changes
  useEffect(() => {
    if (debouncedText.trim().length === 0 || !apiKey) {
      if (debouncedText.trim().length === 0) {
        setSuggestions([]);
      }
      return;
    }

    const fetchSuggestions = async (text: string, messages: Message[]) => {
      if (!apiKey || isLoading || !suggestionsConfig.enabled) {
        return;
      }

      setIsLoading(true);

      try {
        const { object } = await generateObject({
          model: google(suggestionsConfig.model || 'gemini-2.5-flash-lite'),
          schema: z.object({
            suggestions: z.array(z.string()),
          }),
          system: SUGGESTIONS_PROMPT.replace(
            '{USER_PERSONA}',
            suggestionsConfig.settings?.system_instructions || ''
          ),
          messages: [
            ...messages.map(m => ({
              role: 'user' as const,
              content: `${m.type === 'transcription' ? 'Partner' : 'User'}: ${m.text}`,
            })),
            {
              role: 'user' as const,
              content: `User: ${text}`,
            },
          ],
        });

        if (object?.suggestions) {
          setSuggestions(
            object.suggestions.map((suggestionText: string) => ({
              text: suggestionText,
              audio_path: undefined,
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions(debouncedText, history);
  }, [debouncedText, apiKey, suggestionsConfig.enabled, suggestionsConfig.model, google, history]);

  return {
    suggestions,
    isLoading,
    clearSuggestions,
  };
}
