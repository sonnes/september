// Browser-compatible version of the Autocomplete library
// Includes additional browser-specific features and optimizations

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

export interface AutocompleteOptions {
  maxSuggestions?: number;
  minWordLength?: number;
  caseSensitive?: boolean;
  enablePhrases?: boolean;
}

export interface SuggestionResult {
  text: string;
  frequency: number;
  type: 'word' | 'phrase';
}

export class BrowserAutocomplete {
  private wordFrequencies: WordFrequency = {};
  private phraseFrequencies: PhraseFrequency = {};
  private ngrams: NGramData = {};
  private isTrained = false;
  private options: Required<AutocompleteOptions>;

  constructor(options: AutocompleteOptions = {}) {
    this.options = {
      maxSuggestions: options.maxSuggestions || 10,
      minWordLength: options.minWordLength || 2,
      caseSensitive: options.caseSensitive || false,
      enablePhrases: options.enablePhrases !== false,
    };
  }

  /**
   * Train the autocomplete service with a corpus of text
   */
  train(corpus: string): void {
    if (!corpus || typeof corpus !== 'string') {
      throw new Error('Corpus must be a non-empty string');
    }

    // Reset data
    this.wordFrequencies = {};
    this.phraseFrequencies = {};
    this.ngrams = {};

    // Normalize and split corpus into sentences
    const sentences = this.normalizeText(corpus)
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Process each sentence
    sentences.forEach(sentence => {
      this.processSentence(sentence);
    });

    this.isTrained = true;
  }

  /**
   * Get completions for words starting with the given input
   */
  getCompletions(input: string): string[] {
    if (!this.isTrained) {
      throw new Error('Service must be trained before use');
    }

    if (!input || typeof input !== 'string') {
      return [];
    }

    const normalizedInput = this.options.caseSensitive ? input.trim() : input.toLowerCase().trim();
    const completions: SuggestionResult[] = [];

    // Find words that start with the input
    Object.entries(this.wordFrequencies).forEach(([word, frequency]) => {
      const wordToCheck = this.options.caseSensitive ? word : word.toLowerCase();
      const inputToCheck = this.options.caseSensitive
        ? normalizedInput
        : normalizedInput.toLowerCase();

      if (wordToCheck.startsWith(inputToCheck) && word.length >= this.options.minWordLength) {
        completions.push({
          text: word,
          frequency,
          type: 'word',
        });
      }
    });

    // Sort by frequency (descending) and then by length (ascending)
    return completions
      .sort((a, b) => {
        if (b.frequency !== a.frequency) {
          return b.frequency - a.frequency;
        }
        return a.text.length - b.text.length;
      })
      .slice(0, this.options.maxSuggestions)
      .map(result => result.text);
  }

  /**
   * Get the most likely next words after a given sequence
   */
  getNextWord(sequence: string): string[] {
    if (!this.isTrained) {
      throw new Error('Service must be trained before use');
    }

    if (!sequence || typeof sequence !== 'string') {
      return [];
    }

    const normalizedSequence = this.normalizeText(sequence).trim();

    // Find the n-gram data for this sequence
    const ngramData = this.ngrams[normalizedSequence];
    if (!ngramData) {
      return [];
    }

    // Get next words sorted by frequency
    const nextWords = Object.entries(ngramData.nextWords)
      .sort(([, freqA], [, freqB]) => freqB - freqA)
      .slice(0, this.options.maxSuggestions)
      .map(([word]) => word);

    return nextWords;
  }

  /**
   * Get the most likely next phrases after a given sequence
   */
  getNextPhrase(sequence: string): string[] {
    if (!this.isTrained || !this.options.enablePhrases) {
      return [];
    }

    if (!sequence || typeof sequence !== 'string') {
      return [];
    }

    const normalizedSequence = this.normalizeText(sequence).trim();

    // Find the n-gram data for this sequence
    const ngramData = this.ngrams[normalizedSequence];
    if (!ngramData) {
      return [];
    }

    // Get next phrases sorted by frequency
    const nextPhrases = Object.entries(ngramData.nextPhrases)
      .sort(([, freqA], [, freqB]) => freqB - freqA)
      .slice(0, this.options.maxSuggestions)
      .map(([phrase]) => phrase);

    return nextPhrases;
  }

  /**
   * Get all suggestions (words and phrases) for a given input
   */
  getAllSuggestions(input: string): SuggestionResult[] {
    const wordSuggestions = this.getCompletions(input).map(word => ({
      text: word,
      frequency: this.wordFrequencies[word] || 0,
      type: 'word' as const,
    }));

    if (!this.options.enablePhrases) {
      return wordSuggestions;
    }

    // Also look for phrase completions
    const phraseSuggestions: SuggestionResult[] = [];
    Object.entries(this.phraseFrequencies).forEach(([phrase, frequency]) => {
      const phraseToCheck = this.options.caseSensitive ? phrase : phrase.toLowerCase();
      const inputToCheck = this.options.caseSensitive ? input.trim() : input.toLowerCase().trim();

      if (phraseToCheck.startsWith(inputToCheck)) {
        phraseSuggestions.push({
          text: phrase,
          frequency,
          type: 'phrase',
        });
      }
    });

    // Combine and sort all suggestions
    const allSuggestions = [...wordSuggestions, ...phraseSuggestions];
    return allSuggestions
      .sort((a, b) => {
        if (b.frequency !== a.frequency) {
          return b.frequency - a.frequency;
        }
        return a.text.length - b.text.length;
      })
      .slice(0, this.options.maxSuggestions);
  }

  /**
   * Process a single sentence to build frequency data and n-grams
   */
  private processSentence(sentence: string): void {
    const words = sentence.split(/\s+/).filter(word => word.length > 0);

    if (words.length === 0) return;

    // Count word frequencies
    words.forEach(word => {
      const normalizedWord = this.normalizeWord(word);
      if (normalizedWord && normalizedWord.length >= this.options.minWordLength) {
        this.wordFrequencies[normalizedWord] = (this.wordFrequencies[normalizedWord] || 0) + 1;
      }
    });

    // Build n-grams and track next words/phrases
    for (let i = 0; i < words.length - 1; i++) {
      // Create n-gram sequences of increasing length
      for (let n = 1; n <= Math.min(4, i + 1); n++) {
        const sequence = words.slice(i - n + 1, i + 1).join(' ');
        const nextWord = words[i + 1];

        if (nextWord) {
          // Initialize n-gram data if it doesn't exist
          if (!this.ngrams[sequence]) {
            this.ngrams[sequence] = {
              nextWords: {},
              nextPhrases: {},
            };
          }

          // Count next word frequency
          const normalizedNextWord = this.normalizeWord(nextWord);
          if (normalizedNextWord) {
            this.ngrams[sequence].nextWords[normalizedNextWord] =
              (this.ngrams[sequence].nextWords[normalizedNextWord] || 0) + 1;
          }

          // Look ahead for phrases (2-3 words) if enabled
          if (this.options.enablePhrases) {
            for (
              let phraseLength = 2;
              phraseLength <= 3 && i + phraseLength < words.length;
              phraseLength++
            ) {
              const phrase = words.slice(i + 1, i + 1 + phraseLength).join(' ');
              const normalizedPhrase = this.normalizePhrase(phrase);

              if (normalizedPhrase) {
                this.phraseFrequencies[normalizedPhrase] =
                  (this.phraseFrequencies[normalizedPhrase] || 0) + 1;

                this.ngrams[sequence].nextPhrases[normalizedPhrase] =
                  (this.ngrams[sequence].nextPhrases[normalizedPhrase] || 0) + 1;
              }
            }
          }
        }
      }
    }
  }

  /**
   * Normalize text by removing extra whitespace and converting to lowercase
   */
  private normalizeText(text: string): string {
    let normalized = text.replace(/\s+/g, ' ').trim();

    if (!this.options.caseSensitive) {
      normalized = normalized.toLowerCase();
    }

    return normalized;
  }

  /**
   * Normalize a single word by removing punctuation and converting to lowercase
   */
  private normalizeWord(word: string): string {
    let normalized = word.replace(/[^\w\s]/g, '').trim();

    if (!this.options.caseSensitive) {
      normalized = normalized.toLowerCase();
    }

    return normalized.length > 0 ? normalized : '';
  }

  /**
   * Normalize a phrase by removing punctuation and converting to lowercase
   */
  private normalizePhrase(phrase: string): string {
    let normalized = phrase
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!this.options.caseSensitive) {
      normalized = normalized.toLowerCase();
    }

    return normalized.length > 0 ? normalized : '';
  }

  /**
   * Check if the service has been trained
   */
  isReady(): boolean {
    return this.isTrained;
  }

  /**
   * Get statistics about the trained data
   */
  getStats(): {
    totalWords: number;
    totalPhrases: number;
    totalNGrams: number;
    averageWordFrequency: number;
    options: Required<AutocompleteOptions>;
  } {
    if (!this.isTrained) {
      throw new Error('Service must be trained before getting stats');
    }

    const totalWords = Object.keys(this.wordFrequencies).length;
    const totalPhrases = Object.keys(this.phraseFrequencies).length;
    const totalNGrams = Object.keys(this.ngrams).length;

    const wordFreqSum = Object.values(this.wordFrequencies).reduce((sum, freq) => sum + freq, 0);
    const averageWordFrequency = totalWords > 0 ? wordFreqSum / totalWords : 0;

    return {
      totalWords,
      totalPhrases,
      totalNGrams,
      averageWordFrequency,
      options: this.options,
    };
  }

  /**
   * Update options after construction
   */
  updateOptions(newOptions: Partial<AutocompleteOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Clear all trained data
   */
  clear(): void {
    this.wordFrequencies = {};
    this.phraseFrequencies = {};
    this.ngrams = {};
    this.isTrained = false;
  }
}
