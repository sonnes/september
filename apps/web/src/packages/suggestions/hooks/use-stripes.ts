'use client';

import { useMemo } from 'react';

import { useAccount } from '@/packages/account';
import { useMessages, useSpaces, useSavedPhrases, topPhrases } from '@/packages/spaces';
import { useEditorContext } from '@/packages/editor';

import {
  boardPhrases,
  boardWords,
  composeSuggestions,
  stripeForText,
} from '../lib/stripes';
import { Suggestion } from '../types';
import { useSuggestions } from './use-suggestions';

/** Number of saved phrases surfaced as the curated default in the stripe. */
const STRIPE_SAVED_LIMIT = 5;

export interface Stripe {
  text: string;
  tokens: string[];
  hidden: number;
  source?: Suggestion['source'];
}

export interface UseStripesReturn {
  stripes: Stripe[];
  pinnedChips: string[];
}

export function useStripes({ chatId }: { chatId?: string }): UseStripesReturn {
  const { text } = useEditorContext();
  const { account } = useAccount();

  // Space history — recent user messages for history source
  const { messages: historyMessages } = useMessages({ spaceId: chatId, limit: 50 });

  // Source spaceMd from the space's context field (LLM persona/steering only)
  const { spaces } = useSpaces();
  const spaceMd = spaces.find(s => s.id === chatId)?.context ?? '';

  // Global context from the account (CLAUDE.md-style, user + standing facts)
  const globalMd = account?.context ?? '';

  // LLM suggestions — keyed on current text + conversation
  const { suggestions: llmSuggestions } = useSuggestions({
    text,
    globalMd,
    spaceMd,
    history: historyMessages,
  });

  // Curated phrases come from the space's saved-phrases list (top 5, pinned
  // first) — not from parsing context markdown.
  const { phrases: savedPhrases } = useSavedPhrases({ spaceId: chatId });
  const savedTexts = useMemo(
    () => topPhrases(savedPhrases, STRIPE_SAVED_LIMIT),
    [savedPhrases]
  );

  // Saved phrases split into multi-word phrases (stripes) and single-word chips
  const activeMdPhrases = useMemo(() => boardPhrases(savedTexts), [savedTexts]);
  const activeMdWords = useMemo(() => boardWords(savedTexts), [savedTexts]);

  // History texts — user-type messages only, oldest first so historyMatches reverses correctly
  const historyTexts = useMemo(
    () => historyMessages.filter(m => m.type === 'user').map(m => m.text),
    [historyMessages]
  );

  // LLM result texts
  const llmTexts = useMemo(() => llmSuggestions.map(s => s.text), [llmSuggestions]);

  // Compose and convert to stripes
  const stripes = useMemo<Stripe[]>(() => {
    const composed = composeSuggestions({
      typed: text,
      mdPhrases: activeMdPhrases,
      history: historyTexts,
      llm: llmTexts,
    });
    return composed
      .map(s => ({ ...stripeForText(s.text, text), source: s.source }))
      .filter(s => s.hidden < s.tokens.length);
  }, [text, activeMdPhrases, historyTexts, llmTexts]);

  // Pinned chips — md single-words prefix-filtered against current text
  const pinnedChips = useMemo<string[]>(() => {
    const lower = text.trim().toLowerCase();
    return activeMdWords.filter(w => !lower || w.toLowerCase().startsWith(lower));
  }, [activeMdWords, text]);

  return {
    stripes,
    pinnedChips,
  };
}
