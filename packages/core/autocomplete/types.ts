export interface SuggestionResult {
  word: string;
  frequency: number;
  confidence?: number;
}

export interface PredictionResult {
  word: string;
  frequency: number;
  confidence?: number;
  context?: string;
}

export interface CorpusStats {
  totalWords: number;
  uniqueWords: number;
  bigramCount: number;
  trigramCount: number;
  averageWordLength: number;
}

export interface SuggestionOptions {
  maxResults?: number;
  minFrequency?: number;
  includeFrequency?: boolean;
  caseSensitive?: boolean;
}

export interface PredictionOptions {
  maxResults?: number;
  minFrequency?: number;
  includeFrequency?: boolean;
  useTrigrams?: boolean;
  useBigrams?: boolean;
}
