'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { z } from 'zod';

import { useAISettings, useGenerate } from '@september/ai';
import { Message } from '@september/chats';
import { Suggestion } from '@september/suggestions/types';

const SUGGESTIONS_PROMPT = `Generate 5 possible NEXT things the User might WANT TO SAY to the person they are speaking with.

<context>
- The User is a person with speech or motor difficulties using an assistive communication app to speak out loud to someone in front of them
- The "Me:" lines below are things the User has already said through the app
- "Them:" lines (if any) are transcriptions of the other person's speech — these are often MISSING because transcription is optional, so most of the time you will only see the User's own utterances
- Because the other side is usually invisible, DO NOT assume the User is answering a question. Assume they are driving the conversation forward and need help saying their NEXT thing
- Think of suggestions as "what would this person most plausibly want to say next to keep this conversation going?"
</context>

<rules>
- Suggestions must be things the User (Me) would say out loud next — never replies FROM the other person
- Do NOT generate answers to a question the User just asked (they asked it, they don't need to answer it)
- Prefer natural continuations of the User's own thread: follow-up questions they might ask, additional things they might add, new related topics, closers, clarifications, or small talk that fits the moment
- Keep suggestions short, speakable, and natural — this is spoken conversation, not written text
- Offer variety across the 5 suggestions (e.g. one question, one statement, one topic shift) so the User has real choices
- Match the User's tone and style from the persona
- STRICTLY maintain the same language as the conversation context
- Return ONLY a JSON array of 5 strings, no other text
</rules>

<persona>
{USER_PERSONA}
</persona>

<examples>
<example>
<description>Only the User's side is visible — the common case. Suggestions continue the User's thread, they do NOT answer "How are you today?" because the User asked that, not the other person.</description>
<input>
Me: How are you today?
Me: It's good to see you
</input>
<output>["It's been a while", "What have you been up to?", "You look great", "Do you have time to catch up?", "Tell me what's new with you"]</output>
</example>
<example>
<description>User is opening a conversation with a single greeting. Suggestions are natural next things to say, not responses.</description>
<input>
Me: Hello
</input>
<output>["How have you been?", "Thanks for coming over", "I wanted to talk with you", "Can you sit with me for a bit?", "It's good to see you"]</output>
</example>
<example>
<description>Transcription of the other person is available — treat it as context but still generate the User's NEXT utterance.</description>
<input>
Me: How was your trip?
Them: It was amazing, we spent a week in the mountains
</input>
<output>["That sounds wonderful", "Which mountains did you visit?", "Did you hike much?", "I'd love to see photos", "Was the weather good?"]</output>
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
  const requestIdRef = useRef(0);
  const historyRef = useRef(history);
  historyRef.current = history;

  const { suggestionsConfig } = useAISettings();
  const { generate, isReady } = useGenerate({
    provider: suggestionsConfig.provider,
    model: suggestionsConfig.model,
  });

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Re-fetch suggestions whenever the latest message changes. Keying on the
  // last message id (a stable primitive) guarantees a refetch for every new
  // message — even if one arrives while a previous fetch is still in flight.
  const lastMessageId = history[history.length - 1]?.id;

  useEffect(() => {
    if (!lastMessageId || !isReady || !suggestionsConfig.enabled) {
      setSuggestions([]);
      return;
    }

    const requestId = ++requestIdRef.current;
    setSuggestions([]);
    setIsLoading(true);

    const messagesContent = historyRef.current
      .map(m => `${m.type === 'transcription' ? 'Them' : 'Me'}: ${m.text}`)
      .join('\n');

    generate({
      prompt: `Context: ${context}\nConversation:\n${messagesContent}`,
      system: SUGGESTIONS_PROMPT.replace(
        '{USER_PERSONA}',
        suggestionsConfig.settings?.system_instructions || ''
      ),
    })
      .then((result: string | undefined) => {
        // Drop stale responses — only the latest in-flight request wins.
        if (requestId !== requestIdRef.current) return;
        if (result) {
          try {
            const parsed = JSON.parse(
              result.replace('```json', '').replace('```', '').trim()
            ) as string[];
            setSuggestions(
              parsed.map((text: string) => ({ text, audio_path: undefined }))
            );
          } catch (error) {
            console.error('Error parsing suggestions:', error);
          }
        }
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current) return;
        console.error('Error fetching suggestions:', error);
        setIsLoading(false);
      });
  }, [
    lastMessageId,
    isReady,
    suggestionsConfig.enabled,
    suggestionsConfig.settings?.system_instructions,
    context,
    generate,
  ]);

  return {
    suggestions,
    isLoading,
    clearSuggestions,
  };
}
