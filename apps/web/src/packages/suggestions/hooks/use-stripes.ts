'use client';

import { useMemo } from 'react';

import { useAccount } from '@/packages/account';
import { useEditorContext } from '@/packages/editor';
import {
  matchCode,
  topPhrases,
  topRows,
  trailingWord,
  useMessages,
  useSavedPhrases,
  useSpaces,
} from '@/packages/spaces';

import {
  boardPhrases,
  boardWords,
  codeExpansionText,
  composeSuggestions,
  MAX_COMPOSED,
  stripeForText,
} from '../lib/stripes';
import { Suggestion } from '../types';
import { useSuggestions } from './use-suggestions';

/** Number of saved phrases surfaced as the curated default in the stripe. */
const STRIPE_SAVED_LIMIT = 5;
/** Starter rows shown alongside phrases (phrases fill the rest of the budget). */
const STRIPE_STARTER_LIMIT = 2;

export interface Stripe {
  text: string;
  tokens: string[];
  hidden: number;
  source?: Suggestion['source'];
  /** The typed code that surfaced this stripe (source 'code' only). */
  code?: string;
}

export interface UseStripesReturn {
  stripes: Stripe[];
  pinnedChips: string[];
}

type UseStripesOptions = {
  chatId?: string;
  historyText?: string;
};

function historyMessageFromText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return [];

  return [
    {
      id: `source-${trimmed}`,
      text: trimmed,
      type: 'user',
      created_at: new Date(0),
    },
  ];
}

export function useStripes({ chatId, historyText }: UseStripesOptions): UseStripesReturn {
  const { text } = useEditorContext();
  const { account } = useAccount();

  // Space history — recent user messages for history source
  const { messages: historyMessages } = useMessages({ spaceId: chatId, limit: 50 });

  // Source spaceMd from the space's context field (LLM persona/steering only)
  const { spaces } = useSpaces();
  const spaceMd = spaces.find(s => s.id === chatId)?.context ?? '';

  // Global context from the account (CLAUDE.md-style, user + standing facts)
  const globalMd = account?.context ?? '';
  const sourceHistory = useMemo(
    () => (historyText === undefined ? historyMessages : historyMessageFromText(historyText)),
    [historyMessages, historyText]
  );

  // LLM suggestions — keyed on current text + conversation
  const { suggestions: llmSuggestions } = useSuggestions({
    text,
    globalMd,
    spaceMd,
    history: sourceHistory,
  });

  // Curated phrases come from the space's saved-phrases list (pinned first).
  const { phrases: savedPhrases } = useSavedPhrases({ spaceId: chatId });
  // All phrases across spaces — codes defined anywhere work everywhere.
  const { phrases: allPhrases } = useSavedPhrases();

  // Starters share the stripe budget: 2 starter rows when any exist, phrases
  // fill the remainder of the 5-row curated allowance.
  const starterTexts = useMemo(
    () => topRows(savedPhrases, STRIPE_STARTER_LIMIT, 'starter').map(r => r.text),
    [savedPhrases]
  );
  const savedTexts = useMemo(
    () => topPhrases(savedPhrases, STRIPE_SAVED_LIMIT - starterTexts.length),
    [savedPhrases, starterTexts]
  );

  // Saved phrases split into multi-word phrases (stripes) and single-word chips
  const activeMdPhrases = useMemo(() => boardPhrases(savedTexts), [savedTexts]);
  const activeMdWords = useMemo(() => boardWords(savedTexts), [savedTexts]);

  // Code match on the word at the caret — deterministic and local, so it never
  // waits on the LLM debounce. The stripe's text is the composer text with the
  // trailing code replaced; the existing take path consumes the trigger.
  const codeStripe = useMemo<Stripe | undefined>(() => {
    const word = trailingWord(text);
    if (!word) return undefined;
    const row = matchCode(word, allPhrases, chatId);
    if (!row) return undefined;
    const expanded = codeExpansionText(text, row.text);
    if (expanded.trim().toLowerCase() === text.trim().toLowerCase()) return undefined;
    return { ...stripeForText(expanded, text), source: 'code', code: row.code };
  }, [text, allPhrases, chatId]);

  // History texts — user-type messages only, oldest first so historyMatches reverses correctly
  const historyTexts = useMemo(
    () => sourceHistory.filter(m => m.type === 'user').map(m => m.text),
    [sourceHistory]
  );

  // LLM result texts
  const llmTexts = useMemo(() => llmSuggestions.map(s => s.text), [llmSuggestions]);

  // Compose and convert to stripes
  const stripes = useMemo<Stripe[]>(() => {
    const composed = composeSuggestions({
      typed: text,
      mdPhrases: activeMdPhrases,
      starters: starterTexts,
      history: historyTexts,
      llm: llmTexts,
    });
    const rows = composed
      .map(s => ({ ...stripeForText(s.text, text), source: s.source }))
      .filter(s => s.hidden < s.tokens.length);
    if (!codeStripe) return rows;
    return [
      codeStripe,
      ...rows.filter(s => s.text.toLowerCase() !== codeStripe.text.toLowerCase()),
    ].slice(0, MAX_COMPOSED);
  }, [text, activeMdPhrases, starterTexts, historyTexts, llmTexts, codeStripe]);

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
