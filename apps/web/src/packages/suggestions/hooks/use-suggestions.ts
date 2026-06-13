'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { z } from 'zod';

import { useAISettings, useGenerate } from '@/packages/ai';
import { Message } from '@/packages/spaces';
import { buildSuggestionPrompt } from '../lib/context';
import { ignoreUnnecessaryDiffs } from '../lib/reanchor';
import { Suggestion } from '../types';

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
  globalMd = '',
  spaceMd = '',
  history = [],
}: {
  /** Current in-progress editor text. When non-empty, triggers completion-mode fetch. */
  text?: string;
  /** Global (account-level) markdown context. */
  globalMd?: string;
  /** Per-space markdown context. */
  spaceMd?: string;
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

      const { system, user: prompt } = buildSuggestionPrompt({
        globalMd,
        spaceMd,
        history: historyRef.current,
        typed: text,
      });

      try {
        const result = await generate({ prompt, system });

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
    globalMd,
    spaceMd,
    generate,
  ]);

  return {
    suggestions,
    isLoading,
    clearSuggestions,
  };
}
