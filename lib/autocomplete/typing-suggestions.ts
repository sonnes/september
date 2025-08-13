import { TrieNode } from './trie-node';
import type {
  CorpusStats,
  PredictionOptions,
  PredictionResult,
  SuggestionOptions,
  SuggestionResult,
} from './types';

// Re-export types to match autocomplete API
export interface WordFrequency {
  [word: string]: number;
}

export interface PhraseFrequency {
  [phrase: string]: number;
}

export interface NGramData {
  [sequence: string]: {
    nextWords: WordFrequency;
    nextPhrases: PhraseFrequency;
  };
}

/**
 * AI-powered typing suggestions engine
 * Provides word completions and next word predictions using n-gram models
 * Implements the same public API as the original autocomplete module
 */

export class TypingSuggestions {
  private wordFrequency: Map<string, number>;
  private wordTrie: TrieNode;
  private bigramModel: Map<string, Map<string, number>>;
  private trigramModel: Map<string, Map<string, number>>;
  private totalWords: number;
  private totalWordLength: number;
  private isTrained = false;

  constructor() {
    this.wordFrequency = new Map();
    this.wordTrie = new TrieNode();
    this.bigramModel = new Map();
    this.trigramModel = new Map();
    this.totalWords = 0;
    this.totalWordLength = 0;
  }

  /**
   * Train the autocomplete service with a corpus of text
   * This is the main entry point that matches the original Autocomplete API
   */
  train(corpus: string): void {
    if (!corpus || typeof corpus !== 'string') {
      throw new Error('Corpus must be a non-empty string');
    }

    this.processCorpus(corpus);
    this.isTrained = true;
  }

  /**
   * Get completions for words starting with the given input
   * This matches the original Autocomplete API
   */
  getCompletions(input: string): string[] {
    if (!this.isTrained) {
      throw new Error('Service must be trained before use');
    }

    if (!input || typeof input !== 'string') {
      return [];
    }

    const results = this.getCompletionsAdvanced(input);
    return results.map(result => result.word);
  }

  /**
   * Get the most likely next words after a given sequence
   * This matches the original Autocomplete API
   */
  getNextWord(sequence: string): string[] {
    if (!this.isTrained) {
      throw new Error('Service must be trained before use');
    }

    if (!sequence || typeof sequence !== 'string') {
      return [];
    }

    // Normalize the sequence to match original behavior
    const normalizedSequence = sequence.toLowerCase().trim();
    const words = normalizedSequence.split(/\s+/).filter(word => word.length > 0);

    if (words.length === 0) return [];

    // Use the advanced suggestions engine but return simple word array
    const results = this.getNextWordAdvanced(normalizedSequence);
    return results.map(result => result.word);
  }

  /**
   * Get the most likely next phrases after a given sequence
   * Returns phrases of 2-4 words based on the sequence context
   * This matches the original Autocomplete API
   */
  getNextPhrase(sequence: string): string[] {
    if (!this.isTrained) {
      throw new Error('Service must be trained before use');
    }

    if (!sequence || typeof sequence !== 'string') {
      return [];
    }

    const normalizedSequence = sequence.toLowerCase().trim();
    const words = normalizedSequence.split(/\s+/).filter(word => word.length > 0);

    if (words.length === 0) return [];

    const phrases: string[] = [];
    const phraseFrequency = new Map<string, number>();

    // Get next word predictions to start building phrases
    const nextWords = this.getNextWordAdvanced(sequence);

    // Build phrases by extending each next word prediction
    for (const nextWordResult of nextWords) {
      const firstWord = nextWordResult.word;

      // Try to build 2-word phrases
      const twoWordPhrases = this.buildPhrasesFromWord(firstWord, 1);
      for (const phrase of twoWordPhrases) {
        const freq = phraseFrequency.get(phrase) || 0;
        phraseFrequency.set(phrase, freq + nextWordResult.frequency);
      }

      // Try to build 3-word phrases
      const threeWordPhrases = this.buildPhrasesFromWord(firstWord, 2);
      for (const phrase of threeWordPhrases) {
        const freq = phraseFrequency.get(phrase) || 0;
        phraseFrequency.set(phrase, freq + nextWordResult.frequency * 0.8); // Slightly lower weight
      }

      // Try to build 4-word phrases
      const fourWordPhrases = this.buildPhrasesFromWord(firstWord, 3);
      for (const phrase of fourWordPhrases) {
        const freq = phraseFrequency.get(phrase) || 0;
        phraseFrequency.set(phrase, freq + nextWordResult.frequency * 0.6); // Lower weight for longer phrases
      }
    }

    // Convert to array and sort by frequency
    const sortedPhrases = Array.from(phraseFrequency.entries())
      .map(([phrase, frequency]) => ({ phrase, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      //.slice(0, 10) // Get top 10 phrases
      .map(item => item.phrase);

    return sortedPhrases;
  }

  /**
   * Check if the service has been trained
   * This matches the original Autocomplete API
   */
  isReady(): boolean {
    return this.isTrained;
  }

  /**
   * Get statistics about the trained data
   * This matches the original Autocomplete API
   */
  getStats(): {
    totalWords: number;
    totalPhrases: number;
    totalNGrams: number;
    averageWordFrequency: number;
  } {
    if (!this.isTrained) {
      throw new Error('Service must be trained before getting stats');
    }

    const stats = this.getStatsAdvanced();

    return {
      totalWords: stats.uniqueWords, // Match original: count unique words
      totalPhrases: 0, // Not tracked in suggestions module
      totalNGrams: stats.bigramCount + stats.trigramCount,
      averageWordFrequency: stats.totalWords > 0 ? stats.totalWords / stats.uniqueWords : 0, // Calculate actual average frequency
    };
  }

  /**
   * Process corpus text and build language models
   * @param text - The corpus text to process
   * @param options - Processing options
   */
  processCorpus(
    text: string,
    options: {
      caseSensitive?: boolean;
      minWordLength?: number;
      maxWordLength?: number;
    } = {}
  ): void {
    const { caseSensitive = false, minWordLength = 1, maxWordLength = 50 } = options;

    // Clean and tokenize text
    let processedText = text;
    if (!caseSensitive) {
      processedText = text.toLowerCase();
    }

    const words = processedText
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(
        word => word.length >= minWordLength && word.length <= maxWordLength && word.length > 0
      );

    this.totalWords = words.length;
    this.totalWordLength = words.reduce((sum, word) => sum + word.length, 0);

    // Build word frequency map and trie
    for (const word of words) {
      const currentFreq = this.wordFrequency.get(word) || 0;
      this.wordFrequency.set(word, currentFreq + 1);
      this.wordTrie.insert(word, 1);
    }

    // Build bigram model (pairs of consecutive words)
    for (let i = 0; i < words.length - 1; i++) {
      const current = words[i];
      const next = words[i + 1];

      if (!this.bigramModel.has(current)) {
        this.bigramModel.set(current, new Map());
      }
      const nextWords = this.bigramModel.get(current)!;
      nextWords.set(next, (nextWords.get(next) || 0) + 1);
    }

    // Build trigram model (triplets of consecutive words)
    for (let i = 0; i < words.length - 2; i++) {
      const bigram = words[i] + ' ' + words[i + 1];
      const next = words[i + 2];

      if (!this.trigramModel.has(bigram)) {
        this.trigramModel.set(bigram, new Map());
      }
      const nextWords = this.trigramModel.get(bigram)!;
      nextWords.set(next, (nextWords.get(next) || 0) + 1);
    }
  }

  /**
   * Get word completions starting with the given prefix (advanced version)
   * @param prefix - The prefix to complete
   * @param options - Suggestion options
   * @returns Array of completion suggestions
   */
  getCompletionsAdvanced(prefix: string, options: SuggestionOptions = {}): SuggestionResult[] {
    const {
      maxResults = 10,
      minFrequency = 0,
      includeFrequency = true,
      caseSensitive = false,
    } = options;

    if (!prefix) return [];

    const normalizedPrefix = caseSensitive ? prefix : prefix.toLowerCase();
    const completions = this.wordTrie.findWordsWithPrefix(normalizedPrefix);

    // Filter by minimum frequency and create result objects
    const filteredCompletions = completions
      .filter(item => item.frequency >= minFrequency)
      .map(item => ({
        word: item.word,
        frequency: item.frequency,
        confidence: this.calculateConfidence(item.frequency),
      }));

    // Sort by frequency (highest first), then alphabetically for ties
    filteredCompletions.sort((a, b) => {
      if (b.frequency !== a.frequency) {
        return b.frequency - a.frequency;
      }
      return a.word.localeCompare(b.word);
    });

    // Return top results
    return filteredCompletions.slice(0, maxResults);
  }

  /**
   * Get next word predictions based on context (advanced version)
   * @param context - The text context to predict from
   * @param options - Prediction options
   * @returns Array of prediction results
   */
  getNextWordAdvanced(context: string, options: PredictionOptions = {}): PredictionResult[] {
    const {
      maxResults = 5,
      minFrequency = 0,
      includeFrequency = true,
      useTrigrams = true,
      useBigrams = true,
    } = options;

    if (!context) return [];

    const words = context
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);

    if (words.length === 0) return [];

    const predictions = new Map<string, number>();

    // Try trigram prediction if we have at least 2 words
    if (useTrigrams && words.length >= 2) {
      const bigram = words[words.length - 2] + ' ' + words[words.length - 1];
      if (this.trigramModel.has(bigram)) {
        const trigramPredictions = this.trigramModel.get(bigram)!;
        for (const [word, count] of trigramPredictions) {
          predictions.set(word, (predictions.get(word) || 0) + count * 2); // Higher weight for trigrams
        }
      }
    }

    // Add bigram predictions with lower weight
    if (useBigrams) {
      const lastWord = words[words.length - 1];
      if (this.bigramModel.has(lastWord)) {
        const bigramPredictions = this.bigramModel.get(lastWord)!;
        for (const [word, count] of bigramPredictions) {
          predictions.set(word, (predictions.get(word) || 0) + count);
        }
      }
    }

    // Convert to array and filter by minimum frequency
    const filteredPredictions = Array.from(predictions.entries())
      .filter(([_, frequency]) => frequency >= minFrequency)
      .map(([word, frequency]) => ({
        word,
        frequency,
        confidence: this.calculateConfidence(frequency),
        context: words.slice(-2).join(' '), // Last 2 words as context
      }));

    // Sort by frequency (highest first), then alphabetically for ties
    filteredPredictions.sort((a, b) => {
      if (b.frequency !== a.frequency) {
        return b.frequency - a.frequency;
      }
      return a.word.localeCompare(b.word);
    });

    // Return top results
    return filteredPredictions.slice(0, maxResults);
  }

  /**
   * Get comprehensive statistics about the processed corpus (advanced version)
   * @returns Corpus statistics
   */
  getStatsAdvanced(): CorpusStats {
    return {
      totalWords: this.totalWords,
      uniqueWords: this.wordFrequency.size,
      bigramCount: this.bigramModel.size,
      trigramCount: this.trigramModel.size,
      averageWordLength: this.totalWords > 0 ? this.totalWordLength / this.totalWords : 0,
    };
  }

  /**
   * Check if a word exists in the vocabulary
   * @param word - The word to check
   * @returns True if the word exists
   */
  hasWord(word: string): boolean {
    return this.wordFrequency.has(word.toLowerCase());
  }

  /**
   * Get the frequency of a specific word
   * @param word - The word to get frequency for
   * @returns The frequency count, or 0 if word doesn't exist
   */
  getWordFrequency(word: string): number {
    return this.wordFrequency.get(word.toLowerCase()) || 0;
  }

  /**
   * Clear all data and reset the engine
   */
  clear(): void {
    this.wordFrequency.clear();
    this.wordTrie = new TrieNode();
    this.bigramModel.clear();
    this.trigramModel.clear();
    this.totalWords = 0;
    this.totalWordLength = 0;
    this.isTrained = false;
  }

  /**
   * Calculate confidence score based on frequency
   * @param frequency - The word frequency
   * @returns Confidence score between 0 and 1
   */
  private calculateConfidence(frequency: number): number {
    if (this.totalWords === 0) return 0;
    return Math.min(frequency / this.totalWords, 1);
  }

  /**
   * Get the most common words in the corpus
   * @param count - Number of words to return
   * @returns Array of most common words with frequencies
   */
  getMostCommonWords(count: number = 10): SuggestionResult[] {
    const words = Array.from(this.wordFrequency.entries())
      .map(([word, frequency]) => ({
        word,
        frequency,
        confidence: this.calculateConfidence(frequency),
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, count);

    return words;
  }

  /**
   * Get vocabulary size
   * @returns Number of unique words
   */
  getVocabularySize(): number {
    return this.wordFrequency.size;
  }

  /**
   * Build phrases of specified length starting from a given word
   * @param startWord - The word to start the phrase with
   * @param additionalWords - Number of additional words to add (1 = 2-word phrase, 2 = 3-word phrase, etc.)
   * @returns Array of phrases
   */
  private buildPhrasesFromWord(startWord: string, additionalWords: number): string[] {
    const phrases: string[] = [];

    if (additionalWords === 0) {
      return [startWord];
    }

    // Get next word predictions for the starting word
    const nextWords = this.getNextWordAdvanced(startWord, {
      maxResults: 5,
      minFrequency: 0,
      includeFrequency: false,
      useTrigrams: true,
      useBigrams: true,
    });

    for (const nextWordResult of nextWords) {
      if (additionalWords === 1) {
        // 2-word phrase
        phrases.push(`${startWord} ${nextWordResult.word}`);
      } else {
        // Recursively build longer phrases
        const longerPhrases = this.buildPhrasesFromWord(nextWordResult.word, additionalWords - 1);
        for (const longerPhrase of longerPhrases) {
          phrases.push(`${startWord} ${longerPhrase}`);
        }
      }
    }

    return phrases;
  }
}
