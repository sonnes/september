/**
 * Trie data structure for efficient prefix matching
 * Used for word completion suggestions
 */

export interface FuzzyResult {
  word: string;
  frequency: number;
  /** Weighted edit distance between the user's pattern and the word prefix. */
  cost: number;
}

export interface FuzzyOptions {
  /** Maximum allowed weighted edit cost. Default 1.0. */
  maxCost?: number;
  /** Hard cap on emitted results, ranked by (cost asc, frequency desc). Default 50. */
  maxResults?: number;
  /**
   * Substitution cost function. Default charges 1 for any substitution.
   * Provide `editCost` from `./keyboard-layout` to enable QWERTY weighting.
   */
  editCost?: (a: string, b: string) => number;
}

const DEFAULT_SUB_COST = (a: string, b: string): number => (a === b ? 0 : 1);

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

  /**
   * Find words that approximately start with `pattern`, tolerating substitution
   * / insertion / deletion up to `maxCost` weighted edits. Uses a DFS over the
   * trie with per-node dynamic-programming rows — the same algorithm Gboard
   * documents for its on-device fuzzy decoder.
   *
   * Cost semantics:
   *   - Substitution cost comes from `editCost` (default: 0 for identity,
   *     1 otherwise). Pass `editCost` from `./keyboard-layout` for QWERTY
   *     proximity weighting.
   *   - Insertion (trie has a char the pattern doesn't) and deletion (pattern
   *     has a char the trie doesn't) are hardcoded to 1. These dominate typo
   *     cost less than substitution, so keeping them at 1 avoids runaway
   *     fuzziness.
   *   - A word's final cost is the *minimum* row[|pattern|] seen along the
   *     path from root to that word's end-of-word node — so a long completion
   *     like "application" isn't re-penalized for its extra suffix after the
   *     pattern already matched cleanly.
   */
  findFuzzyPrefix(pattern: string, opts: FuzzyOptions = {}): FuzzyResult[] {
    const maxCost = opts.maxCost ?? 1;
    const maxResults = opts.maxResults ?? 50;
    const subCost = opts.editCost ?? DEFAULT_SUB_COST;

    const patternLen = pattern.length;
    const initialRow = new Array<number>(patternLen + 1);
    for (let i = 0; i <= patternLen; i++) initialRow[i] = i; // deletion baseline

    const results: FuzzyResult[] = [];

    const visit = (
      node: TrieNode,
      path: string,
      parentRow: readonly number[],
      prefixMinCost: number,
    ): void => {
      // Emit here first (for the empty-pattern / path == pattern case) using
      // the frozen prefix cost from the best ancestor match.
      if (
        node.isEndOfWord &&
        prefixMinCost <= maxCost &&
        path.length > 0 // root has path === ''; ignored since root.isEndOfWord is false
      ) {
        results.push({ word: path, frequency: node.frequency, cost: prefixMinCost });
      }

      for (const [ch, child] of node.children) {
        const row = new Array<number>(patternLen + 1);
        row[0] = parentRow[0] + 1; // insert trie char (pattern ignored it)
        let rowMin = row[0];

        for (let i = 1; i <= patternLen; i++) {
          const sub = parentRow[i - 1] + subCost(pattern[i - 1], ch);
          const ins = parentRow[i] + 1;
          const del = row[i - 1] + 1;
          const v = Math.min(sub, ins, del);
          row[i] = v;
          if (v < rowMin) rowMin = v;
        }

        const childPrefixCost = Math.min(prefixMinCost, row[patternLen]);

        // Prune: if every cell exceeds maxCost and our best frozen prefix cost
        // has already exceeded it, no descendant can emit a hit.
        if (rowMin > maxCost && childPrefixCost > maxCost) continue;

        visit(child, path + ch, row, childPrefixCost);
      }
    };

    // Special case: pattern empty. Everything matches with cost 0; just walk
    // the trie and emit.
    if (patternLen === 0) {
      visit(this, '', initialRow, 0);
    } else {
      visit(this, '', initialRow, Infinity);
    }

    results.sort((a, b) => {
      if (a.cost !== b.cost) return a.cost - b.cost;
      if (a.frequency !== b.frequency) return b.frequency - a.frequency;
      return a.word < b.word ? -1 : a.word > b.word ? 1 : 0;
    });
    return results.slice(0, maxResults);
  }
}
