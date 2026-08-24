export { Autocomplete } from './autocomplete.ts';
import { Autocomplete } from './autocomplete.ts';
import { SEED_CORPUS } from './corpus.ts';
import { DICTIONARY } from './dictionary.ts';
import { tokenize } from './tokenizer.ts';

export { SEED_CORPUS } from './corpus.ts';
export { DICTIONARY } from './dictionary.ts';
export { TrieNode } from './trie-node.ts';
export {
  toSnapshot,
  toEngineSnapshot,
  isCompatibleSnapshot,
} from './persistence.ts';
export { NgramModel } from './ngram-model.ts';
export {
  LayeredAutocomplete,
  DEFAULT_BLEND,
  DEFAULT_CHAT_ADAPTIVE_THRESHOLD,
} from './layered-autocomplete.ts';
export {
  DAY_MS,
  DEFAULT_HALF_LIFE_MS,
  DEFAULT_DECAY_SKIP_WINDOW_MS,
  decayFactor,
  decayCount,
  halfLifeFromDays,
  shouldSkipDecay,
} from './recency.ts';
export { tokenize as tokenizeUnicode } from './tokenizer.ts';
export { editCost as qwertyEditCost } from './keyboard-layout.ts';

export type {
  SuggestionResult,
  PredictionResult,
  CorpusStats,
  SuggestionOptions,
  PredictionOptions,
} from './types.ts';
export type {
  WordFrequency,
  PhraseFrequency,
  NGramData,
  SuggestWordOptions,
  RankedWord,
  AutocompleteOptions,
  ObserveOptions,
  ChatScopeOptions,
} from './autocomplete.ts';
export type {
  EngineSnapshot,
  EngineSnapshotV1,
  EngineSnapshotV2,
  AnyEngineSnapshot,
} from './persistence.ts';
export type {
  SerializedNgram,
  SerializedNgramV1,
  SerializedNgramV2,
  NgramPrediction,
  NgramModelOptions,
  MaxPerOrder,
} from './ngram-model.ts';
export type {
  BlendWeights,
  LayeredAutocompleteOptions,
  ObserveOptions as LayeredObserveOptions,
  ScoreOptions,
} from './layered-autocomplete.ts';
export type { Token, TokenKind } from './tokenizer.ts';
export type { FuzzyResult, FuzzyOptions } from './trie-node.ts';

export * from './utils.ts';
export * from './sample-data.ts';

/** The most words that fit in the desktop suggestion stripe. */
export const MAX_SUGGESTIONS = 6;

/** Build the shared engine with September's spoken corpus and dictionary. */
export function createEngine(): Autocomplete {
  const engine = new Autocomplete();
  engine.train(SEED_CORPUS);
  engine.seedDictionary(DICTIONARY);
  return engine;
}

function words(text: string): string[] {
  return tokenize(text)
    .filter((token) => token.kind === 'word')
    .map((token) => token.normalized);
}

function isWordComplete(text: string): boolean {
  return /[\s.,!?;:]$/.test(text);
}

/** Return the desktop stripe suggestions for the current composer text. */
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

/** Replace the partial word, or append after completed text. */
export function applySuggestion(text: string, word: string): string {
  const kept = isWordComplete(text) ? text : text.replace(/\S+$/, '');
  return `${kept}${word} `;
}
