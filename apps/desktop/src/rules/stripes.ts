/**
 * The rules of a suggestion stripe: a row of word tiles where a press takes
 * the sentence up to that word.
 *
 * Ported from `apps/web/src/packages/suggestions/lib/stripes.ts`. Keep the
 * rules the same in both apps.
 */

export type SuggestionSource = "md" | "starter" | "history" | "llm" | "code";

export interface Suggestion {
  text: string;
  source: SuggestionSource;
}


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
 * Merges already-fetched suggestion lists into one stripe list.
 * Order: md (curated) → history (grounded) → llm (baseline).
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

  const push = (text: string, source: SuggestionSource) => {
    const key = text.toLowerCase();
    if (seen.has(key) || key === lower) return;
    seen.add(key);
    out.push({ text, source });
  };

  // Md phrases — prefix-filtered when text is non-empty
  for (const phrase of phrases) {
    if (!lower || phrase.toLowerCase().startsWith(lower)) push(phrase, "md");
  }

  // Starters — same prefix filtering; deduped against phrases by `seen`
  for (const starter of starters) {
    if (!lower || starter.toLowerCase().startsWith(lower)) push(starter, "starter");
  }

  // History — already prefix-filtered by historyMatches
  for (const phrase of historyMatches(typed, history)) push(phrase, "history");

  // LLM completions
  for (const sentence of llm) push(sentence, "llm");

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

/**
 * The tile at full size, in pixels. The numbers mirror `STRIPE_BASE` in the
 * web app, so a row reads the same in both.
 */
export const TILE = {
  fontPx: 16,
  gapPx: 6,
  wordPadXPx: 16,
  punctPadXPx: 10,
  minHeightPx: 46,
  /** The mark in the gutter keeps its size, so it leaves the width alone. */
  markPx: 16,
  /** A tile draws a line on each side, and the line takes width too. */
  borderPx: 1,
};

/** The smallest a tile may shrink before it stops being easy to press. */
export const TILE_SCALE_MIN = 0.5;

/**
 * The width of one character of Noto Sans at 16 px, in the medium weight.
 *
 * ponytail: one number instead of a layout engine. The web app measures each
 * word with Pretext. Bring that engine over when a real sentence still does
 * not fit.
 */
const CHAR_PX = 8.4;

export interface StripeSize {
  /** The letters the row shows, without the words already typed. */
  chars: number;
  /** The tiles the row shows. Each one carries its own padding. */
  tokens: number;
}

/**
 * How much to shrink every tile, so the widest row stays on one line.
 *
 * One scale for every row, as in the web app, so the rows stay a set.
 */
export function tileScale(rows: readonly StripeSize[], availablePx: number): number {
  if (availablePx <= 0) return 1;

  let widest = 0;
  for (const row of rows) {
    if (row.tokens === 0) continue;
    // The padding of a tile costs more than its letters, so the count of
    // tiles matters as much as the count of letters.
    const width =
      row.chars * CHAR_PX +
      row.tokens * (TILE.wordPadXPx * 2 + TILE.gapPx + TILE.borderPx * 2);
    // The key at the end of the row scales with the tiles.
    widest = Math.max(
      widest,
      width + TILE.fontPx + TILE.wordPadXPx * 2 + TILE.gapPx + TILE.borderPx * 2,
    );
  }

  if (widest <= 0) return 1;
  return Math.max(TILE_SCALE_MIN, Math.min(1, (availablePx - TILE.markPx) / widest));
}
