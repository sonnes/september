'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { z } from 'zod';

import { useAISettings, useGenerate } from '@/packages/ai';
import { Message } from '@/packages/chats';
import { ignoreUnnecessaryDiffs } from '../lib/reanchor';
import { Suggestion } from '../types';

/**
 * Opening-utterance prompt — used when the editor text is empty.
 * Same "next utterance" framing as before.
 */
const OPENING_PROMPT = `Generate 5 possible NEXT things the User might WANT TO SAY to the person they are speaking with.

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
</examples>`;

/**
 * Completion prompt — used when the editor has in-progress text.
 * Instructs the model to return full sentences that BEGIN with the typed text.
 */
const COMPLETION_PROMPT = `Complete the User's partial input into 5 full spoken sentences.

<context>
- The User is composing a spoken message using an assistive communication app
- The "current input" below is what they have typed so far — it may be a partial word, phrase, or sentence
- The "Me:" and "Them:" lines are the recent conversation history for context
</context>

<rules>
- Each of the 5 completions MUST begin with the user's current input verbatim — do NOT rephrase or reword the typed prefix
- Complete the sentence naturally in the same language as the typed input
- Keep completions short, speakable, and natural — this is spoken conversation
- Honor the user's persona, tone, and the conversation flow
- Return ONLY a JSON array of 5 strings, no other text
</rules>

<persona>
{USER_PERSONA}
</persona>

<example>
<input_text>I need</input_text>
<output>["I need some water, please.", "I need help with this.", "I need to rest for a while.", "I need you to call my doctor.", "I need a moment, thank you."]</output>
</example>`;

const SuggestionsSchema = z.object({
  suggestions: z.array(z.string()),
});

type SuggestionsType = z.infer<typeof SuggestionsSchema>;

/** Debounce delay (ms) for re-fetching on text change. */
const DEBOUNCE_MS = 200;

interface UseSuggestionsReturn {
  suggestions: Suggestion[];
  isLoading: boolean;
  clearSuggestions: () => void;
}

export function useSuggestions({
  text = '',
  context,
  history = [],
}: {
  /** Current in-progress editor text. When non-empty, triggers completion-mode fetch. */
  text?: string;
  context?: string;
  history?: Message[];
}): UseSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const historyRef = useRef(history);
  historyRef.current = history;
  const abortRef = useRef<AbortController | null>(null);

  const { suggestionsConfig } = useAISettings();
  const { generate, isReady } = useGenerate({
    provider: suggestionsConfig.provider,
    model: suggestionsConfig.model,
  });

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Re-fetch on text change (debounced) or on the last message id changing.
  // When text is empty we key on the last message id (original behavior).
  // When text is non-empty we debounce on the text value.
  const lastMessageId = history[history.length - 1]?.id;

  useEffect(() => {
    if (!isReady || !suggestionsConfig.enabled) {
      setSuggestions([]);
      return;
    }

    // Abort any in-flight request.
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    const requestId = ++requestIdRef.current;
    setSuggestions([]);
    setIsLoading(true);

    const isCompletion = text.trim().length > 0;

    const timer = setTimeout(async () => {
      if (signal.aborted) return;

      const messagesContent = historyRef.current
        .map(m => `${m.type === 'transcription' ? 'Them' : 'Me'}: ${m.text}`)
        .join('\n');

      const persona = suggestionsConfig.settings?.system_instructions || '';

      let prompt: string;
      let systemPrompt: string;

      if (isCompletion) {
        systemPrompt = COMPLETION_PROMPT.replace('{USER_PERSONA}', persona);
        prompt = `Current input: "${text}"\n\nContext: ${context ?? ''}\nConversation:\n${messagesContent}`;
      } else {
        systemPrompt = OPENING_PROMPT.replace('{USER_PERSONA}', persona);
        prompt = `Context: ${context ?? ''}\nConversation:\n${messagesContent}`;
      }

      try {
        const result = await generate({ prompt, system: systemPrompt });

        if (signal.aborted || requestId !== requestIdRef.current) return;

        if (result) {
          try {
            const parsed = JSON.parse(
              (result as string).replace('```json', '').replace('```', '').trim()
            ) as string[];

            const reconciled = isCompletion
              ? parsed.map(s => ignoreUnnecessaryDiffs(text.trim(), s))
              : parsed;

            setSuggestions(reconciled.map((s: string) => ({ text: s, source: 'llm' as const })));
          } catch (error) {
            console.error('Error parsing suggestions:', error);
          }
        }
        setIsLoading(false);
      } catch (error: unknown) {
        if (signal.aborted || requestId !== requestIdRef.current) return;
        console.error('Error fetching suggestions:', error);
        setIsLoading(false);
      }
    }, isCompletion ? DEBOUNCE_MS : 0);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [
    text,
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
