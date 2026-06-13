'use client';

import { useMemo, useState } from 'react';

import { useFirstMessage, useMessages } from '@september/chats';
import { useEditorContext } from '@september/editor';
import { useCustomKeyboards } from '@september/keyboards';
import type { CustomKeyboard } from '@september/keyboards';

import {
  boardPhrases,
  boardWords,
  composeSuggestions,
  stripeForText,
} from '../lib/stripes';
import { Suggestion } from '../types';
import { useSuggestions } from './use-suggestions';

export interface Stripe {
  text: string;
  tokens: string[];
  hidden: number;
  source?: Suggestion['source'];
}

export interface UseStripesReturn {
  stripes: Stripe[];
  pinnedChips: string[];
  boards: CustomKeyboard[];
  activeBoardId: string | null;
  setActiveBoardId: (id: string | null) => void;
  scanMode: boolean;
  setScanMode: (v: boolean) => void;
  activeBoard: CustomKeyboard | null;
}

export function useStripes({ chatId }: { chatId?: string }): UseStripesReturn {
  const { text } = useEditorContext();
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState(false);

  // Chat history — recent user messages for history source
  const { messages: historyMessages } = useMessages({ chatId, limit: 50 });
  const { message: firstMessage } = useFirstMessage(chatId);

  // LLM suggestions — keyed on current text + conversation
  const { suggestions: llmSuggestions } = useSuggestions({
    text,
    context: firstMessage?.text,
    history: historyMessages,
  });

  // Board keyboards
  const { keyboards } = useCustomKeyboards({ chatId });

  const activeBoard = useMemo(
    () => (activeBoardId ? (keyboards.find(k => k.id === activeBoardId) ?? null) : null),
    [activeBoardId, keyboards]
  );

  // Board entries split into phrases / words
  const boardEntries = useMemo(
    () => (activeBoard ? activeBoard.buttons.map(b => b.value || b.text) : []),
    [activeBoard]
  );
  const activeBoardPhrases = useMemo(() => boardPhrases(boardEntries), [boardEntries]);
  const activeBoardWords = useMemo(() => boardWords(boardEntries), [boardEntries]);

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
      boardPhrases: activeBoardPhrases,
      history: historyTexts,
      llm: llmTexts,
    });
    return composed
      .map(s => ({ ...stripeForText(s.text, text), source: s.source }))
      .filter(s => s.hidden < s.tokens.length);
  }, [text, activeBoardPhrases, historyTexts, llmTexts]);

  // Pinned chips — board single-words prefix-filtered against current text
  const pinnedChips = useMemo<string[]>(() => {
    const lower = text.trim().toLowerCase();
    return activeBoardWords.filter(
      w => !lower || w.toLowerCase().startsWith(lower)
    );
  }, [activeBoardWords, text]);

  return {
    stripes,
    pinnedChips,
    boards: keyboards,
    activeBoardId,
    setActiveBoardId,
    scanMode,
    setScanMode,
    activeBoard,
  };
}
