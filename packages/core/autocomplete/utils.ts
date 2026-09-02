import { Autocomplete } from './autocomplete.ts';
import type { SuggestionResult } from './types.ts';

/**
 * Utility functions for the suggestions library
 */

/**
 * Clean and normalize text for processing
 * @param text - Raw text input
 * @param options - Cleaning options
 * @returns Cleaned text
 */
export function cleanText(
  text: string,
  options: {
    removePunctuation?: boolean;
    removeNumbers?: boolean;
    normalizeWhitespace?: boolean;
    toLowerCase?: boolean;
  } = {}
): string {
  const {
    removePunctuation = true,
    removeNumbers = false,
    normalizeWhitespace = true,
    toLowerCase = true,
  } = options;

  let cleaned = text;

  if (removePunctuation) {
    cleaned = cleaned.replace(/[^\w\s]/g, ' ');
  }

  if (removeNumbers) {
    cleaned = cleaned.replace(/\d+/g, ' ');
  }

  if (normalizeWhitespace) {
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
  }

  if (toLowerCase) {
    cleaned = cleaned.toLowerCase();
  }

  return cleaned;
}

/**
 * Tokenize text into words
 * @param text - Input text
 * @param options - Tokenization options
 * @returns Array of tokens
 */
export function tokenize(
  text: string,
  options: {
    minLength?: number;
    maxLength?: number;
    removeStopWords?: boolean;
    stopWords?: Set<string>;
  } = {}
): string[] {
  const { minLength = 1, maxLength = 50, removeStopWords = false, stopWords = new Set() } = options;

  const words = text
    .split(/\s+/)
    .filter(word => word.length >= minLength && word.length <= maxLength && word.length > 0);

  if (removeStopWords && stopWords.size > 0) {
    return words.filter(word => !stopWords.has(word.toLowerCase()));
  }

  return words;
}

/**
 * Merge multiple suggestion results
 * @param results - Array of suggestion result arrays
 * @param options - Merge options
 * @returns Merged and deduplicated results
 */
export function mergeSuggestions(
  results: SuggestionResult[][],
  options: {
    maxResults?: number;
    weightBySource?: boolean;
  } = {}
): SuggestionResult[] {
  const { maxResults = 10, weightBySource = false } = options;

  const merged = new Map<string, SuggestionResult>();

  results.forEach((resultArray, sourceIndex) => {
    const weight = weightBySource ? 1 / (sourceIndex + 1) : 1;

    resultArray.forEach(result => {
      const existing = merged.get(result.word);

      if (existing) {
        existing.frequency += result.frequency * weight;
        existing.confidence = Math.max(existing.confidence || 0, result.confidence || 0);
      } else {
        merged.set(result.word, {
          ...result,
          frequency: result.frequency * weight,
        });
      }
    });
  });

  return Array.from(merged.values())
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, maxResults);
}

/**
 * Calculate similarity between two words using Levenshtein distance
 * @param word1 - First word
 * @param word2 - Second word
 * @returns Similarity score (0-1, where 1 is identical)
 */
export function calculateWordSimilarity(word1: string, word2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= word2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= word1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= word2.length; i++) {
    for (let j = 1; j <= word1.length; j++) {
      if (word2.charAt(i - 1) === word1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const maxLength = Math.max(word1.length, word2.length);
  return maxLength === 0 ? 1 : (maxLength - matrix[word2.length][word1.length]) / maxLength;
}

/**
 * Find similar words in a list of suggestions
 * @param targetWord - The word to find similarities for
 * @param suggestions - List of suggestions to search in
 * @param threshold - Minimum similarity threshold (0-1)
 * @returns Array of similar words with similarity scores
 */
export function findSimilarWords(
  targetWord: string,
  suggestions: SuggestionResult[],
  threshold: number = 0.7
): Array<SuggestionResult & { similarity: number }> {
  return suggestions
    .map(suggestion => ({
      ...suggestion,
      similarity: calculateWordSimilarity(targetWord, suggestion.word),
    }))
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
}

/**
 * Common English stop words
 */
export const ENGLISH_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'will',
  'with',
  'the',
  'this',
  'but',
  'they',
  'have',
  'had',
  'what',
  'said',
  'each',
  'which',
  'she',
  'do',
  'how',
  'their',
  'if',
  'up',
  'out',
  'many',
  'then',
  'them',
  'these',
  'so',
  'some',
  'her',
  'would',
  'make',
  'like',
  'into',
  'him',
  'time',
  'two',
  'more',
  'go',
  'no',
  'way',
  'could',
  'my',
  'than',
  'first',
  'been',
  'call',
  'who',
  'its',
  'now',
  'find',
  'long',
  'down',
  'day',
  'did',
  'get',
  'come',
  'made',
  'may',
  'part',
]);
