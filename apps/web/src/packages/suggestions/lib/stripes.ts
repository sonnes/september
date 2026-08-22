/**
 * Pure helpers for partial-sentence-selection suggestion stripes.
 * Ported from apps/web/app/mock/engine.ts — board helpers re-typed to
 * accept plain string[] (not the mock Board), canned suggest() removed.
 */

import type { Suggestion } from '../types';

/** Maximum number of composed suggestions returned by composeSuggestions. */
export const MAX_COMPOSED = 6;

/** Splits a sentence into word tokens, with trailing punctuation as its own token. */
export function tokenize(sentence: string): string[] {
  const tokens: string[] = [];
  for (const word of sentence.split(/\s+/).filter(Boolean)) {
    const m = word.match(/^(.*[^.,!?])([.,!?]+)$/);
    if (m) {
      tokens.push(m[1], m[2]);
    } else {
      tokens.push(word);
    }
  }
  return tokens;
}

/** Joins tokens back into text: punctuation reattaches, and a trailing space is added. */
export function joinTokens(tokens: string[]): string {
  return tokens.join(' ').replace(/ ([.,!?]+( |$))/g, '$1') + ' ';
}

/** Number of leading tokens already fully covered by the typed text. */
export function hiddenTokenCount(tokens: string[], typed: string): number {
  const typedTokens = tokenize(typed);
  let count = 0;
  while (
    count < tokens.length &&
    count < typedTokens.length &&
    tokens[count].toLowerCase() === typedTokens[count].toLowerCase()
  ) {
    count++;
  }
  return count;
}

/**
 * Past spoken messages that start with the typed text, most recent first.
 * Mirrors Project Voice: history search only kicks in once a sentence is
 * started — the blank state is seeded by boards and LLM starters, not history.
 */
export function historyMatches(typed: string, history: string[]): string[] {
  const lower = typed.trim().toLowerCase();
  if (!lower) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const phrase = history[i].trim();
    const key = phrase.toLowerCase();
    if (!phrase || key === lower || seen.has(key) || !key.startsWith(lower)) continue;
    seen.add(key);
    out.push(phrase);
  }
  return out;
}

/** Single-word board entries — these seed the next-word chips. */
export function boardWords(entries: string[]): string[] {
  return entries.filter(e => tokenize(e).length === 1);
}

/** Multi-word board entries — these render as partial-selectable stripes. */
export function boardPhrases(entries: string[]): string[] {
  return entries.filter(e => tokenize(e).length > 1);
}

/**
 * The saved phrases that a stripe can draw, capped at n.
 *
 * The cap comes after the filter, and not before it. A one-word phrase goes
 * to the chips, so a cap taken first spends the budget of the stripe on rows
 * that never appear in it.
 */
export function stripePhrases(entries: string[], n: number): string[] {
  return boardPhrases(entries).slice(0, n);
}

/**
 * Merges already-fetched suggestion lists into one stripe list.
 *
 * The order follows the composer. With nothing typed the rows are the saved
 * phrases and the starters, because a blank stripe must show what the user
 * keeps. Once a sentence starts, the past messages and the model answer
 * first, because they follow the words that are there.
 *
 * Case-insensitive dedup; excludes exact-typed text; caps at MAX_COMPOSED.
 */
export function composeSuggestions({
  typed,
  mdPhrases: phrases,
  starters = [],
  history,
  llm,
}: {
  typed: string;
  mdPhrases: string[];
  /** Sentence-opening prefixes — rendered as starter rows, not speakable as-is. */
  starters?: string[];
  history: string[];
  llm: string[];
}): Suggestion[] {
  const lower = typed.trim().toLowerCase();
  const out: Suggestion[] = [];
  const seen = new Set<string>();

  const push = (text: string, source: Required<Suggestion>['source']) => {
    const key = text.toLowerCase();
    if (seen.has(key) || key === lower) return;
    seen.add(key);
    out.push({ text, source });
  };
  const pushAll = (texts: string[], source: Required<Suggestion>['source']) => {
    for (const text of texts) push(text, source);
  };
  const starting = (text: string) => text.toLowerCase().startsWith(lower);

  // Nothing typed: the rows are the phrases that the user keeps, and then the
  // starters. History answers nothing here, and the model fills what is left.
  if (!lower) {
    pushAll(phrases, 'md');
    pushAll(starters, 'starter');
    pushAll(llm, 'llm');
    return out.slice(0, MAX_COMPOSED);
  }

  // A sentence started: the past messages and the model answer first, because
  // they follow the words that are already there. The saved phrases come
  // after them, prefix-filtered, and deduped by `seen`.
  pushAll(historyMatches(typed, history), 'history');
  pushAll(llm, 'llm');
  pushAll(phrases.filter(starting), 'md');
  pushAll(starters.filter(starting), 'starter');

  return out.slice(0, MAX_COMPOSED);
}

/**
 * Returns the stripe descriptor for a single suggestion against the typed text.
 * Mirrors the inline .map in mock/page.tsx.
 */
export function stripeForText(
  text: string,
  typed: string
): { text: string; tokens: string[]; hidden: number } {
  const tokens = tokenize(text);
  const hidden = hiddenTokenCount(tokens, typed);
  return { text, tokens, hidden };
}

/**
 * Appends the tokens of `entry` to the tokens of `text`, joined back into a string.
 * Used by chip/board-mode insertion. Does NOT call trackKeystroke — the savings
 * analytic (text_length − keys_typed) is correct only when trackKeystroke is not
 * called for suggestion-driven text changes.
 */
export function appendTokens(text: string, entry: string): string {
  return joinTokens([...tokenize(text), ...tokenize(entry)]);
}

/**
 * The composer text with its trailing word (a typed code) replaced by the
 * phrase. This IS the take-consumes-trigger transform: a code stripe's text is
 * this full replacement, so the existing partial-take path (`selectUpTo` →
 * stripe tokens) consumes the trigger with no new take logic.
 */
export function codeExpansionText(typed: string, phraseText: string): string {
  return typed.replace(/\S+$/, phraseText);
}
