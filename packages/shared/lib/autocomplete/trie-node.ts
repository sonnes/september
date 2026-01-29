/**
 * Trie data structure for efficient prefix matching
 * Used for word completion suggestions
 */
export class TrieNode {
  private children: Map<string, TrieNode>;
  private isEndOfWord: boolean;
  private frequency: number;

  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.frequency = 0;
  }

  /**
   * Insert a word into the trie
   * @param word - The word to insert
   * @param frequency - Optional frequency count for the word
   */
  insert(word: string, frequency: number = 1): void {
    let node = this as TrieNode;

    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }

    node.isEndOfWord = true;
    node.frequency += frequency;
  }

  /**
   * Find all words that start with the given prefix
   * @param prefix - The prefix to search for
   * @returns Array of words with the given prefix
   */
  findWordsWithPrefix(prefix: string): Array<{ word: string; frequency: number }> {
    let node = this as TrieNode;

    // Navigate to the node representing the prefix
    for (const char of prefix) {
      if (!node.children.has(char)) {
        return [];
      }
      node = node.children.get(char)!;
    }

    const words: Array<{ word: string; frequency: number }> = [];
    this.collectWords(node, prefix, words);
    return words;
  }

  /**
   * Check if a word exists in the trie
   * @param word - The word to check
   * @returns True if the word exists
   */
  contains(word: string): boolean {
    let node = this as TrieNode;

    for (const char of word) {
      if (!node.children.has(char)) {
        return false;
      }
      node = node.children.get(char)!;
    }

    return node.isEndOfWord;
  }

  /**
   * Get the frequency of a word
   * @param word - The word to get frequency for
   * @returns The frequency count, or 0 if word doesn't exist
   */
  getFrequency(word: string): number {
    let node = this as TrieNode;

    for (const char of word) {
      if (!node.children.has(char)) {
        return 0;
      }
      node = node.children.get(char)!;
    }

    return node.isEndOfWord ? node.frequency : 0;
  }

  /**
   * Recursively collect all words from a given node
   * @param node - The starting node
   * @param prefix - The current prefix
   * @param words - Array to collect words in
   */
  private collectWords(
    node: TrieNode,
    prefix: string,
    words: Array<{ word: string; frequency: number }>
  ): void {
    if (node.isEndOfWord) {
      words.push({ word: prefix, frequency: node.frequency });
    }

    for (const [char, childNode] of node.children) {
      this.collectWords(childNode, prefix + char, words);
    }
  }

  /**
   * Get the total number of words in the trie
   * @returns The count of words
   */
  getWordCount(): number {
    const count = 0;
    this.countWords(this, { value: count });
    return count;
  }

  /**
   * Recursively count words in the trie
   * @param node - The current node
   * @param count - The current count (passed by reference)
   */
  private countWords(node: TrieNode, count: { value: number }): void {
    if (node.isEndOfWord) {
      count.value++;
    }

    for (const childNode of node.children.values()) {
      this.countWords(childNode, count);
    }
  }
}
