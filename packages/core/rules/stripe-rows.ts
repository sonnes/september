/**
 * The rows of ready words above the composer, from the phrases of a space,
 * the words said before, a typed code, and the rows of a model.
 */

import { matchCode, trailingWord } from "./phrases/codes.ts";
import { isKept, topPhrases, topRows } from "./phrases/rows.ts";
import type { SavedPhrase } from "./records.ts";
import {
  codeExpansionText,
  composeSuggestions,
  MAX_COMPOSED,
  stripeForText,
  stripePhrases,
  type SuggestionSource,
} from "./stripes.ts";

/** Curated rows in the stripe, and how many of them may be starters. */
export const SAVED_LIMIT = 5;
const STARTER_LIMIT = 2;

export interface Stripe {
  text: string;
  tokens: string[];
  hidden: number;
  /** The tags after `hidden` that a take puts at the start of the draft. */
  lead?: number;
  hasMore: boolean;
  source: SuggestionSource;
  code?: string;
  /** The user keeps this phrase. */
  kept?: boolean;
  /** The tiles that the typed words found inside the row, as [start, end). */
  found?: [number, number];
}

export interface StripeInput {
  text: string;
  spaceId: string;
  spacePhrases: readonly SavedPhrase[];
  /** The phrases of every space, because a code works in every space. */
  allPhrases: readonly SavedPhrase[];
  history: string[];
  fromModel: string[];
  /** The row the user took from last, which stays first while the draft follows it. */
  selected: Stripe | null;
  /** The most words in a slice, from the access profile. */
  sliceWords: number;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The rows for the typed words, the strongest first. */
export function stripeRows({
  text,
  spaceId,
  spacePhrases,
  allPhrases,
  history,
  fromModel,
  selected,
  sliceWords,
}: StripeInput): Stripe[] {
  const starters = topRows([...spacePhrases], STARTER_LIMIT, "starter").map((row) => row.text);
  // `stripePhrases` caps the rows after it drops the one-word phrases that the chips draw.
  const saved = stripePhrases(
    topPhrases([...spacePhrases], spacePhrases.length),
    SAVED_LIMIT - starters.length,
  );

  const rows: Stripe[] = composeSuggestions({
    typed: text,
    mdPhrases: saved,
    starters,
    history,
    llm: fromModel,
  })
    .map((one) => ({
      ...stripeForText(one.text, text, sliceWords),
      source: one.source,
      kept: isKept(one.text, [...spacePhrases]),
    }))
    .filter((one) => one.hidden < one.tokens.length);

  const first = (stripe: Stripe) =>
    [stripe, ...rows.filter((one) => !same(one.text, stripe.text))].slice(0, MAX_COMPOSED);

  if (selected && !same(selected.text, text)) {
    return first({ ...selected, ...stripeForText(selected.text, text, sliceWords) });
  }

  // A code at the caret is local and exact, so it never waits on the model.
  const word = trailingWord(text);
  const match = word ? matchCode(word, [...allPhrases], spaceId) : undefined;
  if (!match) return rows;

  const expanded = codeExpansionText(text, match.text);
  if (same(expanded, text)) return rows;

  return first({ ...stripeForText(expanded, text, sliceWords), source: "code", code: match.code });
}
