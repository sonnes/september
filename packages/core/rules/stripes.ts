/**
 * The rules of a suggestion stripe: a row of word tiles where a press takes
 * the sentence up to that word.
 *
 * Both applications import the same stripe rules from this module.
 */

import { isTag, stripTags } from "./audio-tags.ts";

export type SuggestionSource = "md" | "starter" | "history" | "llm" | "code";

export interface Suggestion {
  text: string;
  source: SuggestionSource;
}


/** Maximum number of composed suggestions returned by composeSuggestions. */
export const MAX_COMPOSED = 6;

const SENTENCES = new Intl.Segmenter('en', { granularity: 'sentence' });
const MAX_SLICE_WORDS = 6;
const PUNCTUATION = /^[\p{P}\p{S}]+$/u;

/**
 * Splits a sentence into word tokens, with trailing punctuation as its own
 * token. An audio tag such as `[clears throat]` is one token.
 */
export function tokenize(sentence: string): string[] {
  const tokens: string[] = [];
  for (const part of sentence.split(/(\[[^\[\]]+\])/)) {
    if (isTag(part)) {
      tokens.push(part);
      continue;
    }
    for (const word of part.split(/\s+/).filter(Boolean)) {
      const m = word.match(/^(.*[^.,!?])([.,!?]+)$/);
      if (m) {
        tokens.push(m[1], m[2]);
      } else {
        tokens.push(word);
      }
    }
  }
  return tokens;
}

/** Joins tokens back into text: punctuation reattaches, and a trailing space is added. */
export function joinTokens(tokens: string[]): string {
  return tokens.join(' ').replace(/ ([.,!?]+( |$))/g, '$1') + ' ';
}

/**
 * Number of leading tokens already fully covered by the typed text.
 *
 * The words decide. A tag in the suggestion or in the typed text does not
 * stop the match, and a tag between covered words is covered too.
 */
export function hiddenTokenCount(tokens: string[], typed: string): number {
  const typedWords = tokenize(typed).filter((token) => !isTag(token));
  let index = 0;
  let matched = 0;
  let count = 0;
  while (index < tokens.length && matched < typedWords.length) {
    if (isTag(tokens[index])) {
      index++;
      continue;
    }
    if (tokens[index].toLowerCase() !== typedWords[matched].toLowerCase()) break;
    matched++;
    index++;
    count = index;
  }
  return count;
}

/** How a row holds the typed words: as its opening, or from a later word. */
export type Match = "prefix" | "contains";

/**
 * Where the typed words sit in the text. The typed words must start at the
 * start of a word, so "ate" does not find "water". Tags and case do not count.
 */
export function matchTyped(text: string, typed: string): Match | null {
  const lower = stripTags(typed).toLowerCase();
  const words = stripTags(text).toLowerCase();
  if (!lower || words === lower) return null;
  if (words.startsWith(lower)) return "prefix";
  for (let at = words.indexOf(lower, 1); at > 0; at = words.indexOf(lower, at + 1)) {
    if (!/[\p{L}\p{N}]/u.test(words[at - 1])) return "contains";
  }
  return null;
}

/** The tokens of the text that the typed words found, as [start, end). */
function foundRange(tokens: string[], typed: string): [number, number] | null {
  const want = tokenize(stripTags(typed).toLowerCase());
  const words = tokens.flatMap((token, index) =>
    isTag(token) ? [] : [{ token: token.toLowerCase(), index }],
  );
  for (let start = 0; start + want.length <= words.length; start++) {
    const hit = want.every((word, k) =>
      k === want.length - 1
        ? words[start + k].token.startsWith(word)
        : words[start + k].token === word,
    );
    if (hit) return [words[start].index, words[start + want.length - 1].index + 1];
  }
  return null;
}

/**
 * Sentences from past messages that hold the typed text, newest messages first.
 * History matches require nonempty typed text.
 */
export function historyMatches(typed: string, history: string[]): string[] {
  const lower = stripTags(typed).toLowerCase();
  if (!lower) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    for (const { segment } of SENTENCES.segment(history[i])) {
      const phrase = segment.trim();
      const key = phrase.toLowerCase();
      const words = stripTags(key);
      if (!words || seen.has(key) || !matchTyped(phrase, typed)) continue;
      seen.add(key);
      out.push(phrase);
    }
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
  const lower = stripTags(typed).toLowerCase();
  const out: Suggestion[] = [];
  const seen = new Set<string>();

  // The words decide, so one sentence with two sets of tags is one row.
  const push = (text: string, source: SuggestionSource) => {
    const key = stripTags(text).toLowerCase();
    if (seen.has(key) || key === lower) return;
    seen.add(key);
    out.push({ text, source });
  };
  const pushAll = (texts: string[], source: SuggestionSource) => {
    for (const text of texts) push(text, source);
  };
  const by = (match: Match) => (text: string) => matchTyped(text, typed) === match;

  // Nothing typed: the rows are the phrases that the user keeps, and then the
  // starters. History answers nothing here, and the model fills what is left.
  if (!lower) {
    pushAll(phrases, "md");
    pushAll(starters, "starter");
    pushAll(llm, "llm");
    return out.slice(0, MAX_COMPOSED);
  }

  // A sentence started: the past messages and the model answer first, because
  // they follow the words that are already there. The saved phrases come
  // after them, and `seen` drops the repeats.
  //
  // A row that starts with the draft saves more keys, so every one of them
  // goes before a row that only contains the draft. A model row that does
  // not hold the draft is related to it, and keeps the place of a model row.
  const said = historyMatches(typed, history);
  pushAll(said.filter(by("prefix")), "history");
  pushAll(llm.filter((text) => !by("contains")(text)), "llm");
  pushAll(phrases.filter(by("prefix")), "md");
  pushAll(starters.filter(by("prefix")), "starter");
  pushAll(said.filter(by("contains")), "history");
  pushAll(llm.filter(by("contains")), "llm");
  pushAll(phrases.filter(by("contains")), "md");
  pushAll(starters.filter(by("contains")), "starter");

  return out.slice(0, MAX_COMPOSED);
}

/**
 * Returns accepted tokens and the next slice of at most six words.
 * A slice stops at a sentence boundary. The text retains the complete suggestion.
 *
 * A tag does not count as a word. A tag after the last sentence stays with
 * it. A tag that the user typed stays where the user typed it. A tag among
 * the covered words that the user did not type is a lead tag: it moves to
 * the front of the slice, so the row shows it, and `takeTokens` puts it back
 * at the start of the draft.
 *
 * A row that contains the typed words after its opening hides no words, so a
 * press replaces the draft. `found` marks the typed words in the row, and the
 * slice reaches at least to them.
 */
export function stripeForText(
  text: string,
  typed: string
): {
  text: string;
  tokens: string[];
  hidden: number;
  lead: number;
  hasMore: boolean;
  /** The tokens that the typed words found inside the row, as [start, end). */
  found?: [number, number];
} {
  const all = tokenize(text);
  const inside = matchTyped(text, typed) === "contains" ? foundRange(all, typed) : null;
  const covered = inside ? 0 : hiddenTokenCount(all, typed);
  const typedTokens = tokenize(typed);
  const typedTags = new Set(typedTokens.filter(isTag));
  const region = all.slice(0, covered);
  const leads = region.filter((token) => isTag(token) && !typedTags.has(token));
  // The covered words of the row, with the tags where the user typed them.
  const coveredWords = region.filter((token) => !isTag(token));
  const kept: string[] = [];
  let word = 0;
  for (const token of typedTokens) {
    if (isTag(token)) kept.push(token);
    else if (word < coveredWords.length) kept.push(coveredWords[word++]);
    else break;
  }
  const tokens = [...kept, ...leads, ...all.slice(covered)];
  const hidden = kept.length;

  const sentences = [...SENTENCES.segment(text)].map(({ segment }) => {
    const parts = tokenize(segment);
    return { count: parts.length, tagsOnly: parts.length > 0 && parts.every(isTag) };
  });
  let sentenceEnd = 0;
  for (let index = 0; index < sentences.length; index++) {
    sentenceEnd += sentences[index].count;
    if (sentenceEnd > covered && !sentences[index + 1]?.tagsOnly) break;
  }
  // The typed tags are not in the text, so they move the end.
  sentenceEnd += hidden + leads.length - covered;
  let end = hidden;
  let words = 0;
  const reach = inside ? inside[1] + hidden : 0;
  while (end < sentenceEnd || end < reach) {
    if (!PUNCTUATION.test(tokens[end]) && !isTag(tokens[end])) {
      if (words >= MAX_SLICE_WORDS && end >= reach) break;
      words++;
    }
    end++;
  }
  return {
    text,
    tokens: tokens.slice(0, end),
    hidden,
    lead: leads.length,
    hasMore: end < tokens.length,
    found: inside ? [inside[0] + hidden, inside[1] + hidden] : undefined,
  };
}

/**
 * The tokens that a press takes, up to `end`, in the order of the draft.
 * The lead tags of the row go before the covered words.
 */
export function takeTokens(
  stripe: { tokens: string[]; hidden: number; lead?: number },
  end: number
): string[] {
  const lead = stripe.lead ?? 0;
  const tags = stripe.tokens.slice(stripe.hidden, stripe.hidden + lead);
  return [
    ...tags,
    ...stripe.tokens.slice(0, stripe.hidden),
    ...stripe.tokens.slice(stripe.hidden + lead, Math.max(end, stripe.hidden + lead)),
  ];
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
