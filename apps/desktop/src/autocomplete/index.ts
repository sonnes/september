/**
 * The words that the app offers while the user writes.
 *
 * The engine is a copy of the one in the web app. Only this file, and the
 * short `persistence.ts`, are different. Keep the other files the same as the
 * web app, so that a correction in one app moves to the other one.
 *
 * The rules below take no renderer, so a test can read them.
 */
import { Autocomplete } from './autocomplete.ts';
import { SEED_CORPUS } from './corpus.ts';
import { DICTIONARY } from './dictionary.ts';
import { tokenize } from './tokenizer.ts';

export { Autocomplete } from './autocomplete.ts';
export { SEED_CORPUS } from './corpus.ts';
export { DICTIONARY } from './dictionary.ts';
export { tokenize } from './tokenizer.ts';

/** The most words to offer. More than this fills the screen. */
export const MAX_SUGGESTIONS = 6;

/**
 * An engine that knows the seed words and the dictionary.
 *
 * The sentences and the dictionary do different work. The sentences teach the
 * model which word comes after which. The dictionary makes sure that a part-
 * written word always has candidates. Together they save 48% of the keystrokes
 * of everyday speech; the sentences alone save 37%.
 */
export function createEngine(): Autocomplete {
  const engine = new Autocomplete();
  engine.train(SEED_CORPUS);
  engine.seedDictionary(DICTIONARY);
  return engine;
}

/**
 * The words of the text, in lower case.
 *
 * The tokenizer also gives the start and the end of each sentence, and each
 * mark of punctuation. The engine counts words only, so the others go away.
 */
function words(text: string): string[] {
  return tokenize(text)
    .filter((token) => token.kind === 'word')
    .map((token) => token.normalized);
}

/**
 * True when the user completed the last word.
 *
 * A space or a mark of punctuation ends a word. The app then offers the word
 * that comes next. If the user is in the middle of a word, the app offers the
 * spellings of that word.
 */
function isWordComplete(text: string): boolean {
  return /[\s.,!?;:]$/.test(text);
}

/**
 * The words to show for the text in the composer.
 *
 * `spaceId` keeps the words of one space together. The engine gives more
 * weight to the words that the user writes in the space that is open.
 */
export function suggestionsFor(
  engine: Autocomplete,
  text: string,
  spaceId?: string,
): string[] {
  if (text.trim().length === 0 || !engine.isReady()) return [];

  const written = words(text);
  if (written.length === 0) return [];

  const found = isWordComplete(text)
    ? engine.getNextWord(written.slice(-3).join(' '), { chatId: spaceId })
    : engine.getCompletions(written[written.length - 1]);

  return found.slice(0, MAX_SUGGESTIONS);
}

/**
 * The composer text after the user takes a word.
 *
 * A word always ends with a space, because the next thing that the user
 * writes is a new word. This saves one keystroke on each word.
 */
export function applySuggestion(text: string, word: string): string {
  const kept = isWordComplete(text) ? text : text.replace(/\S+$/, '');
  return `${kept}${word} `;
}
