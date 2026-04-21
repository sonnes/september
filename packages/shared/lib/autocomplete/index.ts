export { Autocomplete } from './autocomplete';
export { TrieNode } from './trie-node';
export { AutocompletePersistence, toSnapshot, isCompatibleSnapshot } from './persistence';
export { NgramModel } from './ngram-model';
export { tokenize as tokenizeUnicode } from './tokenizer';
export { editCost as qwertyEditCost } from './keyboard-layout';

export type {
  SuggestionResult,
  PredictionResult,
  CorpusStats,
  SuggestionOptions,
  PredictionOptions,
} from './types';
export type {
  WordFrequency,
  PhraseFrequency,
  NGramData,
  SuggestWordOptions,
  RankedWord,
} from './autocomplete';
export type { EngineSnapshot, AutocompletePersistenceOptions } from './persistence';
export type { SerializedNgram, NgramPrediction, NgramModelOptions } from './ngram-model';
export type { Token, TokenKind } from './tokenizer';
export type { FuzzyResult, FuzzyOptions } from './trie-node';

export * from './utils';
export * from './sample-data';
