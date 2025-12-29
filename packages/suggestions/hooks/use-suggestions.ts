'use client';

import { useCallback, useEffect, useState } from 'react';

import { z } from 'zod';

import { useDebounce } from '@/hooks/use-debounce';

import { useAISettings, useGenerate } from '@/packages/ai';
import { Message } from '@/packages/chats';
import { Suggestion } from '@/packages/suggestions/types';

const SUGGESTIONS_PROMPT = `Generate 5 text completions for the User based on their current typing and conversation context.

<rules>
- Complete or extend the User's current thought naturally
- Each suggestion must be a complete, standalone sentence
- Match the User's tone and style from the persona
- Return ONLY a JSON array of 5 strings, no other text
</rules>

<persona>
{USER_PERSONA}
</persona>

<examples>
<example>
<input>
Partner: What time?
User (typing): 6
</input>
<output>["6 PM works for me", "6:30 would be better", "6 o'clock sharp", "6 is too early for me", "6 sounds good"]</output>
</example>
<example>
<input>
Partner: How are you?
User (typing): I'm
</input>
<output>["I'm doing well, thanks!", "I'm good, how about you?", "I'm okay, just tired", "I'm great!", "I'm hanging in there"]</output>
</example>
</examples>`;

const SuggestionsSchema = z.object({
  suggestions: z.array(z.string()),
});

type SuggestionsType = z.infer<typeof SuggestionsSchema>;

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

  const { suggestionsConfig } = useAISettings();
  const { generate, isReady } = useGenerate({
    provider: suggestionsConfig.provider,
    model: suggestionsConfig.model,
  });

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Auto-fetch suggestions when debounced text changes
  useEffect(() => {
    if (debouncedText.trim().length === 0 || !isReady) {
      if (debouncedText.trim().length === 0) {
        setSuggestions([]);
      }
      return;
    }

    if (isLoading || !suggestionsConfig.enabled) {
      return;
    }

    const fetchSuggestions = async (text: string, messages: Message[]) => {
      setIsLoading(true);

      console.log('fetchSuggestions', text, messages);
      try {
        const messagesContent = messages
          .map(m => `${m.type === 'transcription' ? 'Partner' : 'User'}: ${m.text}`)
          .join('\n');

        const result = await generate({
          prompt: `${messagesContent}\nUser (typing): ${text}`,
          system: SUGGESTIONS_PROMPT.replace(
            '{USER_PERSONA}',
            suggestionsConfig.settings?.system_instructions || ''
          ),
        });

        if (result) {
          try {
            const suggestions = JSON.parse(
              result.replace('```json', '').replace('```', '').trim()
            ) as string[];
            setSuggestions(
              suggestions.map((suggestionText: string) => ({
                text: suggestionText,
                audio_path: undefined,
              }))
            );
          } catch (error) {
            console.log(result);
            throw error;
          }
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions(debouncedText, history);
  }, [
    debouncedText,
    isReady,
    suggestionsConfig.enabled,
    suggestionsConfig.model,
    suggestionsConfig.settings?.system_instructions,
    history,
    generate,
  ]);

  return {
    suggestions,
    isLoading,
    clearSuggestions,
  };
}
