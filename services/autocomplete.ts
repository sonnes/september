import TrieSearch from 'trie-search';

interface AutocompleteOptions {
  maxSuggestions?: number;
  minQueryLength?: number;
}

interface SuggestionItem {
  text: string;
  type: 'word' | 'phrase';
  frequency: number;
}

class AutocompleteService {
  private trie: TrieSearch<SuggestionItem>;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.trie = new TrieSearch('text', {
      min: 1,
      ignoreCase: true,
      cache: true,
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.loadData();
    await this.initializationPromise;
    this.isInitialized = true;
  }

  private async loadData(): Promise<void> {
    try {
      // Load both corpus and word data
      const [corpusData, wordData] = await Promise.all([
        this.loadCorpusData(),
        this.loadWordData(),
      ]);

      // Combine all data into single trie
      const allData: SuggestionItem[] = [
        ...corpusData.map(item => ({ ...item, type: 'phrase' as const })),
        ...wordData.map(item => ({ ...item, type: 'word' as const })),
      ];

      // Add all items to trie
      allData.forEach(item => {
        this.trie.add(item);
      });

      console.log(`AutocompleteService initialized with ${allData.length} items`);
    } catch (error) {
      console.error('Failed to initialize AutocompleteService:', error);
      throw error;
    }
  }

  private async loadCorpusData(): Promise<SuggestionItem[]> {
    try {
      const response = await fetch('/corpus.csv');
      const csvText = await response.text();

      const lines = csvText.split('\n').filter(line => line.trim());
      const phraseMap = new Map<string, number>();

      // Process each line to extract phrases
      lines.forEach(line => {
        const sentences = line.split(/[.!?]+/).filter(s => s.trim());

        sentences.forEach(sentence => {
          const words = sentence
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 0);

          // Add individual words
          words.forEach(word => {
            const cleanWord = word.replace(/[^\w]/g, '');
            if (cleanWord.length >= 2) {
              phraseMap.set(cleanWord, (phraseMap.get(cleanWord) || 0) + 1);
            }
          });

          // Add 2-4 word phrases
          for (let i = 0; i < words.length - 1; i++) {
            for (let j = 2; j <= 4 && i + j <= words.length; j++) {
              const phrase = words.slice(i, i + j).join(' ');
              if (phrase.length >= 3) {
                phraseMap.set(phrase, (phraseMap.get(phrase) || 0) + 1);
              }
            }
          }
        });
      });

      return Array.from(phraseMap.entries())
        .map(([text, frequency]) => ({ text, frequency, type: 'phrase' as const }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10000); // Limit to top 10k phrases for performance
    } catch (error) {
      console.warn('Failed to load corpus data:', error);
      return [];
    }
  }

  private async loadWordData(): Promise<SuggestionItem[]> {
    try {
      const response = await fetch('/ngsl.csv');
      const csvText = await response.text();

      const words = csvText
        .split('\n')
        .filter(line => line.trim())
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length >= 2);

      // Create frequency map (common words get higher frequency)
      const wordMap = new Map<string, number>();
      words.forEach((word, index) => {
        // Higher frequency for words that appear earlier in the list
        const frequency = Math.max(1, 1000 - index);
        wordMap.set(word, frequency);
      });

      return Array.from(wordMap.entries()).map(([text, frequency]) => ({
        text,
        frequency,
        type: 'word' as const,
      }));
    } catch (error) {
      console.warn('Failed to load word data:', error);
      return [];
    }
  }

  async getAutocompleteSuggestions(
    query: string,
    options: AutocompleteOptions = {}
  ): Promise<string[]> {
    const { maxSuggestions = 5, minQueryLength = 2 } = options;

    // Ensure service is initialized
    await this.initialize();

    // Validate query
    if (!query || query.trim().length < minQueryLength) {
      return [];
    }

    const cleanQuery = query.trim().toLowerCase();

    try {
      // Search trie for matches
      const matches = this.trie.search(cleanQuery) as SuggestionItem[];

      // Sort by frequency and length
      matches.sort((a, b) => {
        // Primary sort by frequency
        if (b.frequency !== a.frequency) {
          return b.frequency - a.frequency;
        }
        // Secondary sort by length (prefer shorter matches)
        return a.text.length - b.text.length;
      });

      // Return top suggestions
      return matches.slice(0, maxSuggestions).map(item => item.text);
    } catch (error) {
      console.error('Error getting autocomplete suggestions:', error);
      return [];
    }
  }

  // Helper method to check if service is ready
  isReady(): boolean {
    return this.isInitialized;
  }

  // Helper method to get service stats
  getStats(): { isInitialized: boolean; itemCount: number } {
    return {
      isInitialized: this.isInitialized,
      itemCount: this.trie.get('').length, // Use get method to count items
    };
  }
}

export default new AutocompleteService();
