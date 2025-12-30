'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { z } from 'zod';

import { useAISettings, useGenerate } from '@/packages/ai';
import { Message } from '@/packages/chats';
import { Suggestion } from '@/packages/suggestions/types';

const SUGGESTIONS_PROMPT = `Generate 5 possible next messages for the User to send, based on the conversation context and their typing style.

<rules>
- Suggestions must be responses TO the Partner, written AS the User
- If the User has started typing, complete their thought
- If the User hasn't typed, provide next message the User would likely send
- Match the User's tone and style from the persona
- STRICTLY maintain the same language as the conversation context
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
User (typing): 
</input>
<output>["I'm doing well, thanks!", "I'm good, how about you?", "I'm okay, just tired", "I'm great!", "Hanging in there"]</output>
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
  history = [],
}: {
  text: string;
  history?: Message[];
}): UseSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const textRef = useRef(text);

  // Update ref when text changes
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  const { suggestionsConfig } = useAISettings();
  const { generate, isReady } = useGenerate({
    provider: suggestionsConfig.provider,
    model: suggestionsConfig.model,
  });

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Auto-fetch suggestions when history changes (e.g. new message received)
  useEffect(() => {
    if (history.length === 0 || !isReady) {
      if (history.length === 0) {
        setSuggestions([]);
      }
      return;
    }

    if (isLoading || !suggestionsConfig.enabled) {
      return;
    }

    const fetchSuggestions = async (currentText: string, messages: Message[]) => {
      setIsLoading(true);

      try {
        const messagesContent = messages
          .map(m => `${m.type === 'transcription' ? 'Partner' : 'User'}: ${m.text}`)
          .join('\n');

        const result = await generate({
          prompt: `${messagesContent}\nUser (typing): ${currentText}`,
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
            throw error;
          }
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions(textRef.current, history);
  }, [
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
