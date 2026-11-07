import { isTag, endsWithTag } from '../rules/audio-tags.ts';
import { Autocomplete } from './autocomplete.ts';
import { SEED_CORPUS } from './corpus.ts';
import { DICTIONARY } from './dictionary.ts';
import { tokenize } from './tokenizer.ts';

export type { Autocomplete };

/** The most words in one suggestion stripe. */
export const MAX_SUGGESTIONS = 6;
/** How deep the search for learned audio tags goes. */
const TAG_SEARCH = 50;
/** The most learned tags in one suggestion stripe. */
const MAX_TAGS = 2;
const NEXT_WORDS = 5;
const COMPLETIONS = 10;

/** The engine, trained on September's spoken corpus and dictionary. */
export function createEngine(): Autocomplete {
  return new Autocomplete(SEED_CORPUS, DICTIONARY);
}

function words(text: string): string[] {
  return tokenize(text)
    .filter((token) => token.kind === 'word')
    .map((token) => token.normalized);
}

/** Whether the text ends with a finished word, a mark, or an audio tag. */
export function isWordComplete(text: string): boolean {
  return /[\s.,!?;:\]]$/.test(text);
}

/**
 * The stripe suggestions for the composer text. After a finished word, the
 * learned tags follow the words. At most two tags come, and the stripe holds at
 * most `MAX_SUGGESTIONS`, so a full row of words leaves `wordRow` a tile for
 * a tag of the mood.
 */
export function suggestionsFor(
  engine: Autocomplete,
  text: string,
  spaceId?: string,
): string[] {
  if (text.trim().length === 0) return [];

  const written = words(text);
  if (written.length === 0) return [];

  if (!isWordComplete(text)) {
    return engine.completions(written[written.length - 1], COMPLETIONS).slice(0, MAX_SUGGESTIONS);
  }

  const found = engine.nextWords(written.slice(-3).join(' '), TAG_SEARCH, spaceId);
  // A learned tag is rarer than a word, so the search for tags goes further
  // down the list.
  const tags = found.filter(isTag).slice(0, MAX_TAGS);
  const nextWords = found.slice(0, NEXT_WORDS).filter((word) => !isTag(word));
  return [...nextWords, ...tags].slice(0, MAX_SUGGESTIONS);
}

/**
 * Replace the partial word, or append after completed text. A tag never
 * completes a word, so it goes after the text. A word after a tag gets a space.
 */
export function applySuggestion(text: string, word: string): string {
  if (endsWithTag(text) || (isTag(word) && /\S$/.test(text))) {
    return `${text} ${word} `;
  }
  const kept = isWordComplete(text) ? text : text.replace(/\S+$/, '');
  return `${kept}${word} `;
}
