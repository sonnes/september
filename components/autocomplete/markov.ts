interface MarkovNode {
  transitions: Map<string, number>;
  total: number;
}

export class MarkovChain {
  private static instance: MarkovChain | null = null;
  private chain: Map<string, MarkovNode>;
  private order: number;

  private constructor(order: number = 1) {
    this.chain = new Map();
    this.order = order;
  }

  public static getInstance(order: number = 1): MarkovChain {
    if (!MarkovChain.instance) {
      MarkovChain.instance = new MarkovChain(order);
    }
    return MarkovChain.instance;
  }

  public async initializeCSV(path: string): Promise<void> {
    try {
      const body = await fetch(path).then(response => response.text());
      const lines = body.split('\n');
      for (const line of lines) {
        // remove quotes, special characters and newlines
        const sentence = line
          .replace(/^"|"$/g, '')
          .replace(/[^\w\s]/g, '')
          .replace(/\n/g, '');
        this.addText(sentence);
      }
    } catch (error) {
      console.error('Error loading text file:', error);
      throw error;
    }
  }

  public addText(text: string): void {
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 0);

    // Handle single words and last words by using empty string as key
    for (const word of words) {
      if (!this.chain.has('')) {
        this.chain.set('', {
          transitions: new Map(),
          total: 0,
        });
      }
      const node = this.chain.get('')!;
      const currentCount = node.transitions.get(word) || 0;
      node.transitions.set(word, currentCount + 1);
      node.total += 1;
    }

    // Process n-gram transitions as before
    for (let i = 0; i < words.length - this.order; i++) {
      const prefix = words.slice(i, i + this.order).join(' ');
      const nextWord = words[i + this.order];

      if (!this.chain.has(prefix)) {
        this.chain.set(prefix, {
          transitions: new Map(),
          total: 0,
        });
      }

      const node = this.chain.get(prefix)!;
      const currentCount = node.transitions.get(nextWord) || 0;
      node.transitions.set(nextWord, currentCount + 1);
      node.total += 1;
    }
  }

  public getSuggestions(prefix: string, count: number = 5): string[] {
    const trimmedPrefix = prefix.toLowerCase();
    const endsWithSpace = trimmedPrefix.endsWith(' ');
    const words = trimmedPrefix.trim().split(/\s+/);

    // Case 1: Predict next word (prefix ends with space)
    if (endsWithSpace) {
      const contextWords = words.slice(-this.order);
      const key = contextWords.join(' ');

      if (!this.chain.has(key)) {
        // If no context match, return most common words
        return Array.from(this.chain.get('')?.transitions.entries() || [])
          .sort((a, b) => b[1] - a[1])
          .slice(0, count)
          .map(([word]) => word);
      }

      const node = this.chain.get(key)!;
      return Array.from(node.transitions.entries())
        .map(([word, frequency]) => ({
          word,
          probability: frequency / node.total,
        }))
        .sort((a, b) => b.probability - a.probability)
        .slice(0, count)
        .map(item => item.word);
    }

    // Case 2: Predict incomplete word (prefix doesn't end with space)
    const lastWord = words[words.length - 1];
    const previousWords = words.slice(-this.order - 1, -1);
    const key = previousWords.join(' ');

    // If we have context and it exists in the chain
    if (previousWords.length > 0 && this.chain.has(key)) {
      const node = this.chain.get(key)!;
      const contextPredictions = Array.from(node.transitions.entries())
        .filter(([word]) => word.startsWith(lastWord))
        .map(([word, frequency]) => ({
          word,
          probability: frequency / node.total,
        }))
        .sort((a, b) => b.probability - a.probability)
        .slice(0, count);

      if (contextPredictions.length > 0) {
        return contextPredictions.map(item => item.word);
      }
    }

    // Fallback to general prefix matching
    return this.getPrefixMatches(lastWord, count);
  }

  private getPrefixMatches(prefix: string, count: number): string[] {
    if (!prefix) return [];

    const matches = new Map<string, number>();

    // Collect all words that start with the prefix
    for (const [key, node] of this.chain.entries()) {
      for (const [word, frequency] of node.transitions.entries()) {
        if (word.toLowerCase().startsWith(prefix.toLowerCase())) {
          matches.set(word, (matches.get(word) || 0) + frequency);
        }
      }
    }

    // Sort by frequency and return top matches
    return Array.from(matches.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([word]) => word);
  }

  public reset(): void {
    this.chain.clear();
  }
}
