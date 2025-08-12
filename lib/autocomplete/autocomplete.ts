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

export class Autocomplete {
  private wordFrequencies: WordFrequency = {};
  private phraseFrequencies: PhraseFrequency = {};
  private ngrams: NGramData = {};
  private isTrained = false;

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

    const normalizedInput = input.toLowerCase().trim();
    const completions: string[] = [];

    // Find words that start with the input
    Object.keys(this.wordFrequencies).forEach(word => {
      if (word.toLowerCase().startsWith(normalizedInput)) {
        completions.push(word);
      }
    });

    // Sort by frequency (descending) and then by length (ascending)
    return completions.sort((a, b) => {
      const freqA = this.wordFrequencies[a] || 0;
      const freqB = this.wordFrequencies[b] || 0;

      if (freqA !== freqB) {
        return freqB - freqA;
      }

      return a.length - b.length;
    });
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
      .map(([word]) => word);

    return nextWords;
  }

  /**
   * Get the most likely next phrases after a given sequence
   */
  getNextPhrase(sequence: string): string[] {
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

    // Get next phrases sorted by frequency
    const nextPhrases = Object.entries(ngramData.nextPhrases)
      .sort(([, freqA], [, freqB]) => freqB - freqA)
      .map(([phrase]) => phrase);

    return nextPhrases;
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
      if (normalizedWord) {
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

          // Look ahead for phrases (2-3 words)
          for (
            let phraseLength = 2;
            phraseLength <= 3 && i + phraseLength < words.length;
            phraseLength++
          ) {
            const phrase = words.slice(i + 1, i + 1 + phraseLength).join(' ');
            const normalizedPhrase = this.normalizePhrase(phrase);

            if (normalizedPhrase) {
              this.ngrams[sequence].nextPhrases[normalizedPhrase] =
                (this.ngrams[sequence].nextPhrases[normalizedPhrase] || 0) + 1;
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
    return text.replace(/\s+/g, ' ').toLowerCase().trim();
  }

  /**
   * Normalize a single word by removing punctuation and converting to lowercase
   */
  private normalizeWord(word: string): string {
    const normalized = word
      .replace(/[^\w\s]/g, '')
      .toLowerCase()
      .trim();

    return normalized.length > 0 ? normalized : '';
  }

  /**
   * Normalize a phrase by removing punctuation and converting to lowercase
   */
  private normalizePhrase(phrase: string): string {
    const normalized = phrase
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();

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
    };
  }
}
