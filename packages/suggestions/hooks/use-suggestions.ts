'use client';

import { useCallback, useEffect, useState } from 'react';

import { z } from 'zod';

import { useAISettings, useGenerate } from '@/packages/ai';
import { Message } from '@/packages/chats';
import { Suggestion } from '@/packages/suggestions/types';

const SUGGESTIONS_PROMPT = `Generate 5 possible NEXT messages for the User to send in the conversation.

<context>
- Suggestions are triggered AFTER the User sends a message
- The User has just sent their last message and is now waiting or ready to respond to what comes next
- Generate what the User would MOST LIKELY say next as a follow-up or response
</context>

<rules>
- Suggestions must be the User's NEXT message, not a continuation of their previous one
- Generate natural follow-ups or responses based on the conversation flow
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
Them: Want to grab dinner tonight?
Me: Sure, sounds good!
</input>
<output>["What time works for you?", "Where should we go?", "I know a great place nearby", "Let me check my schedule", "Should we invite anyone else?"]</output>
</example>
<example>
<input>
Them: How are you?
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
  context,
  history = [],
}: {
  context?: string;
  history?: Message[];
}): UseSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

    const fetchSuggestions = async (messages: Message[]) => {
      setIsLoading(true);

      try {
        const messagesContent = messages
          .map(m => `${m.type === 'transcription' ? 'Them' : 'Me'}: ${m.text}`)
          .join('\n');

        const result = await generate({
          prompt: `Context: ${context}\nConversation:\n${messagesContent}`,
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

    fetchSuggestions(history);
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
