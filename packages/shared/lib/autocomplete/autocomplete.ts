import { editCost } from './keyboard-layout';
import { NgramModel } from './ngram-model';
import { toSnapshot, type EngineSnapshot } from './persistence';
import { tokenize } from './tokenizer';
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

export interface SuggestWordOptions {
  /** Text the user has typed so far in the current word. */
  prefix: string;
  /** Preceding word context (raw string; tokenized internally). Optional. */
  context?: string;
  /** Hard cap on returned suggestions. Default 5. */
  maxResults?: number;
  /**
   * Enable typo-tolerant prefix matching via QWERTY-weighted Levenshtein.
   * Default `true` once the prefix is ≥ 2 chars, else `false` (too noisy
   * on very short prefixes — one edit would match almost anything).
   */
  fuzzy?: boolean;
  /** Max weighted edit cost when `fuzzy` is on. Default 1.0. */
  fuzzyMaxCost?: number;
}

export interface RankedWord {
  word: string;
  /** Unigram count of this word in the corpus (always positive). */
  frequency: number;
  /** Blended score that went into ranking. */
  score: number;
  /** Whether this entry matched via fuzzy (edit distance > 0). */
  fuzzy: boolean;
  /** Weighted edit distance if fuzzy, else 0. */
  editCost: number;
}

/**
 * AI-powered typing suggestions engine.
 *
 * Public API (unchanged since v1):
 *   - `train(corpus)`       — load a seed corpus (replaces prior state)
 *   - `getCompletions(prefix)` / `getCompletionsAdvanced`
 *   - `getNextWord(context)` / `getNextWordAdvanced`
 *   - `getNextPhrase(context)`
 *   - `isReady()` / `getStats()` / `getStatsAdvanced()`
 *
 * New in v2 (Phase 1):
 *   - `observe(text)`                — incremental learning, no retrain
 *   - `suggestWord({ prefix, context, fuzzy })` — unified ranking that
 *     blends prefix match with next-word probability, with QWERTY fuzzy
 *     fallback. Recommended entry point for new UIs.
 *   - `getSnapshot()` / `restoreFromSnapshot(s)` — client-side persistence
 *     plumbing (pair with `AutocompletePersistence`).
 *
 * Under the hood, v2 replaces the hand-rolled bigram + trigram maps with a
 * single `NgramModel` using Stupid Backoff up to 5-grams, sentence-boundary
 * conditioning, and Unicode-aware tokenization (emoji, punctuation, CJK).
 */
export class Autocomplete {
  private wordFrequency: Map<string, number>;
  private wordTrie: TrieNode;
  private ngramModel: NgramModel;
  private totalWords: number;
  private totalWordLength: number;
  private isTrained = false;

  constructor() {
    this.wordFrequency = new Map();
    this.wordTrie = new TrieNode();
    this.ngramModel = new NgramModel({ order: 5, lambda: 0.4 });
    this.totalWords = 0;
    this.totalWordLength = 0;
  }

  // ─── Core API (v1 back-compat) ──────────────────────────────────────────

  train(corpus: string): void {
    if (!corpus || typeof corpus !== 'string') {
      throw new Error('Corpus must be a non-empty string');
    }
    this.clear();
    this.observe(corpus);
  }

  getCompletions(input: string): string[] {
    if (!this.isTrained) {
      throw new Error('Service must be trained before use');
    }
    if (!input || typeof input !== 'string') return [];
    return this.getCompletionsAdvanced(input).map(r => r.word);
  }

  getNextWord(sequence: string): string[] {
    if (!this.isTrained) {
      throw new Error('Service must be trained before use');
    }
    if (!sequence || typeof sequence !== 'string') return [];
    return this.getNextWordAdvanced(sequence).map(r => r.word);
  }

  getNextPhrase(sequence: string): string[] {
    if (!this.isTrained) {
      throw new Error('Service must be trained before use');
    }
    if (!sequence || typeof sequence !== 'string') return [];
    return this.buildPhrases(sequence);
  }

  isReady(): boolean {
    return this.isTrained;
  }

  getStats(): {
    totalWords: number;
    totalPhrases: number;
    totalNGrams: number;
    averageWordFrequency: number;
  } {
    if (!this.isTrained) {
      throw new Error('Service must be trained before getting stats');
    }
    const advanced = this.getStatsAdvanced();
    return {
      totalWords: advanced.uniqueWords,
      totalPhrases: 0,
      totalNGrams: this.ngramModel.stats.ngramCount,
      averageWordFrequency:
        advanced.uniqueWords > 0 ? advanced.totalWords / advanced.uniqueWords : 0,
    };
  }

  // ─── New v2 API ──────────────────────────────────────────────────────────

  /**
   * Ingest text into the model incrementally. Unlike `train()`, prior
   * observations are retained. Tokenization is Unicode-aware (handles
   * emoji, contractions, CJK, sentence boundaries). Use this for live
   * learning from user messages.
   */
  observe(text: string): void {
    if (!text || typeof text !== 'string') return;

    const tokens = tokenize(text);
    if (tokens.length === 0) return;

    // Model learns from words, emoji, and sentence-boundary markers. Raw
    // punctuation (`.`, `,`, etc.) is intentionally dropped — its semantic
    // contribution was already captured by the tokenizer turning terminators
    // into `</s>`. Leaving comma/period in-stream pollutes top-K predictions
    // with punctuation in the #1 slot for common contexts like "machine
    // learning ___".
    const stream = tokens
      .filter(t => t.kind !== 'punct')
      .map(t => t.normalized);
    this.ngramModel.observe(stream);

    // Trie and word-frequency maps only track real words (no sentence
    // markers, no punctuation, no emoji — those aren't prefix-completable).
    for (const t of tokens) {
      if (t.kind !== 'word') continue;
      const w = t.normalized;
      this.wordFrequency.set(w, (this.wordFrequency.get(w) ?? 0) + 1);
      this.wordTrie.insert(w, 1);
      this.totalWords++;
      this.totalWordLength += w.length;
    }

    this.isTrained = true;
  }

  /**
   * Unified word suggester: prefix match + context probability + optional
   * fuzzy fallback. The recommended entry point for new UIs over the v1
   * `getCompletions` / `getNextWord` pair.
   */
  suggestWord(opts: SuggestWordOptions): RankedWord[] {
    if (!this.isTrained) return [];
    const prefix = opts.prefix.toLowerCase();
    const maxResults = opts.maxResults ?? 5;

    // Empty prefix → pure next-word prediction (if context) or nothing.
    if (prefix.length === 0) {
      if (!opts.context) return [];
      return this.topNextWords(opts.context, maxResults).map(p => ({
        word: p.word,
        frequency: this.wordFrequency.get(p.word) ?? 0,
        score: p.score,
        fuzzy: false,
        editCost: 0,
      }));
    }

    // Gather prefix candidates.
    const exactHits = this.wordTrie.findWordsWithPrefix(prefix);
    const exactSet = new Set(exactHits.map(h => h.word));

    const fuzzyEnabled = opts.fuzzy ?? prefix.length >= 2;
    const fuzzyHits = fuzzyEnabled
      ? this.wordTrie
          .findFuzzyPrefix(prefix, {
            maxCost: opts.fuzzyMaxCost ?? 1,
            editCost,
            maxResults: 50,
          })
          .filter(h => !exactSet.has(h.word))
      : [];

    const contextTokens = opts.context ? this.contextTokens(opts.context) : [];

    const out: RankedWord[] = [];
    for (const { word, frequency } of exactHits) {
      const score = this.blendScore(word, frequency, contextTokens, 0);
      out.push({ word, frequency, score, fuzzy: false, editCost: 0 });
    }
    for (const { word, frequency, cost } of fuzzyHits) {
      const score = this.blendScore(word, frequency, contextTokens, cost);
      out.push({ word, frequency, score, fuzzy: true, editCost: cost });
    }

    out.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.editCost !== b.editCost) return a.editCost - b.editCost;
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      return a.word < b.word ? -1 : a.word > b.word ? 1 : 0;
    });
    return out.slice(0, maxResults);
  }

  /**
   * Capture a serializable snapshot of the engine state. Pair with
   * `AutocompletePersistence.save()` to survive page reloads.
   */
  getSnapshot(): EngineSnapshot {
    return toSnapshot(this.ngramModel);
  }

  /**
   * Restore engine state from a previously captured snapshot. Rebuilds the
   * trie and word-frequency map from the ngram unigram row — so one
   * snapshot is enough; we don't persist two copies of "which words exist".
   */
  restoreFromSnapshot(snapshot: EngineSnapshot): void {
    this.clear();
    this.ngramModel = NgramModel.deserialize(snapshot.ngram);
    const unigrams = snapshot.ngram.counts[0] ?? [];
    // unigram row has a single context key '' → pairs
    for (const [, pairs] of unigrams) {
      for (const [word, count] of pairs) {
        if (word === '<s>' || word === '</s>') continue;
        this.wordFrequency.set(word, count);
        this.wordTrie.insert(word, count);
        this.totalWords += count;
        this.totalWordLength += word.length * count;
      }
    }
    this.isTrained = this.totalWords > 0;
  }

  // ─── Advanced API ────────────────────────────────────────────────────────

  /**
   * Process corpus text and build language models (v1 back-compat; just
   * forwards to `observe` now).
   */
  processCorpus(text: string, options: { caseSensitive?: boolean } = {}): void {
    // caseSensitive is no longer meaningful — tokenizer normalizes — but
    // we accept it for callers that still pass it.
    void options;
    this.observe(text);
  }

  getCompletionsAdvanced(prefix: string, options: SuggestionOptions = {}): SuggestionResult[] {
    const { maxResults = 10, minFrequency = 0, caseSensitive = false } = options;
    if (!prefix) return [];
    const normalized = caseSensitive ? prefix : prefix.toLowerCase();
    const hits = this.wordTrie
      .findWordsWithPrefix(normalized)
      .filter(h => h.frequency >= minFrequency);
    hits.sort((a, b) => {
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      return a.word.localeCompare(b.word);
    });
    return hits.slice(0, maxResults).map(h => ({
      word: h.word,
      frequency: h.frequency,
      confidence: this.calculateConfidence(h.frequency),
    }));
  }

  getNextWordAdvanced(context: string, options: PredictionOptions = {}): PredictionResult[] {
    const { maxResults = 5, minFrequency = 0 } = options;
    // useBigrams/useTrigrams from v1 are ignored — NgramModel uses backoff
    // across all orders automatically.
    if (!context) return [];

    const tokens = this.contextTokens(context);
    if (tokens.length === 0 && !context.includes('<s>')) return [];

    const preds = this.ngramModel.topK(tokens, maxResults);
    const contextStr = tokens
      .slice(-2)
      .filter(t => t !== '<s>' && t !== '</s>')
      .join(' ');

    return preds
      .map(p => {
        const freq = this.wordFrequency.get(p.word) ?? 0;
        return {
          word: p.word,
          frequency: freq,
          confidence: this.calculateConfidence(freq),
          context: contextStr,
        };
      })
      .filter(p => p.frequency >= minFrequency);
  }

  getStatsAdvanced(): CorpusStats {
    const ngStats = this.ngramModel.stats;
    // Per-order counts: bigram and trigram context counts are the size of
    // those context maps.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countsAny = (this.ngramModel as unknown as { counts: Map<string, Map<string, number>>[] })
      .counts;
    const bigramCount = countsAny[2]?.size ?? 0;
    const trigramCount = countsAny[3]?.size ?? 0;
    return {
      totalWords: this.totalWords,
      uniqueWords: this.wordFrequency.size,
      bigramCount,
      trigramCount,
      averageWordLength: this.totalWords > 0 ? this.totalWordLength / this.totalWords : 0,
      // Expose the new fields without breaking the CorpusStats shape: cast
      // is safe because callers iterating known keys still work.
    } as CorpusStats;
  }

  hasWord(word: string): boolean {
    return this.wordFrequency.has(word.toLowerCase());
  }

  getWordFrequency(word: string): number {
    return this.wordFrequency.get(word.toLowerCase()) ?? 0;
  }

  getMostCommonWords(count = 10): SuggestionResult[] {
    return [...this.wordFrequency.entries()]
      .map(([word, frequency]) => ({
        word,
        frequency,
        confidence: this.calculateConfidence(frequency),
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, count);
  }

  getVocabularySize(): number {
    return this.wordFrequency.size;
  }

  clear(): void {
    this.wordFrequency.clear();
    this.wordTrie = new TrieNode();
    this.ngramModel = new NgramModel({ order: 5, lambda: 0.4 });
    this.totalWords = 0;
    this.totalWordLength = 0;
    this.isTrained = false;
  }

  // ─── Internals ───────────────────────────────────────────────────────────

  /**
   * Tokenize an input string into normalized word tokens suitable for
   * ngram lookup. Preserves the leading `<s>` if the text begins a new
   * sentence (i.e. ends with terminal punctuation, or is itself at start).
   *
   * For in-flight typing like `"hello, how are"` (no trailing punct), we
   * keep the open sentence markers so higher-order n-grams still benefit
   * from the start-of-sentence signal.
   */
  private contextTokens(text: string): string[] {
    // Mirror the `observe()` filter — strip punct, keep words/emoji/sentence
    // markers — so the context stream matches what the model was trained on.
    //
    // One subtlety: the tokenizer always closes the final sentence with
    // `</s>` so training data is well-formed. For a *live* prediction context
    // like `"machine learning"` (mid-sentence, no terminator), that trailing
    // `</s>` would shift the ngram lookup to "what word follows end-of-
    // sentence" — junk. Strip it when the raw input didn't actually end with
    // a sentence terminator.
    const stream = tokenize(text)
      .filter(t => t.kind !== 'punct')
      .map(t => t.normalized);
    const endsWithTerminator = /[.!?…。！？]\s*$/.test(text);
    if (!endsWithTerminator) {
      while (stream.length > 0 && stream[stream.length - 1] === '</s>') {
        stream.pop();
      }
    }
    return stream;
  }

  private topNextWords(contextText: string, k: number) {
    const tokens = this.contextTokens(contextText);
    return this.ngramModel.topK(tokens, k);
  }

  private blendScore(
    word: string,
    frequency: number,
    contextTokens: readonly string[],
    editPenalty: number,
  ): number {
    // Base: normalized unigram probability of the word itself.
    const uniBase = this.totalWords > 0 ? frequency / this.totalWords : 0;
    // Context boost: Stupid-Backoff score; 0 when no context or unseen.
    const ctxBoost =
      contextTokens.length > 0 ? this.ngramModel.score(contextTokens, word) : 0;
    // Blend with 60% weight on context (higher-order evidence) and
    // 40% weight on unigram prior — matches the Ouyang et al. (Gboard)
    // published ratio for the base LM. Easily retunable.
    const blended = 0.6 * ctxBoost + 0.4 * uniBase;
    // Light edit-cost penalty so exact matches always beat 1-edit ones at
    // equal context fit.
    return blended * Math.exp(-0.3 * editPenalty);
  }

  private buildPhrases(sequence: string): string[] {
    const startingWords = this.getNextWordAdvanced(sequence);
    const phrases = new Map<string, number>();

    for (const { word: first, frequency: firstFreq } of startingWords) {
      for (const len of [1, 2, 3] as const) {
        const built = this.extendPhrase([first], len);
        const weight = len === 1 ? 1 : len === 2 ? 0.8 : 0.6;
        for (const phrase of built) {
          const p = phrase.join(' ');
          phrases.set(p, (phrases.get(p) ?? 0) + firstFreq * weight);
        }
      }
    }

    return [...phrases.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([p]) => p);
  }

  private extendPhrase(start: readonly string[], extraWords: number): string[][] {
    if (extraWords === 0) return [start.slice()];

    const preds = this.ngramModel.topK(start, 5);
    const out: string[][] = [];
    for (const { word } of preds) {
      const extended = [...start, word];
      if (extraWords === 1) {
        out.push(extended);
      } else {
        out.push(...this.extendPhrase(extended, extraWords - 1));
      }
    }
    return out;
  }

  private calculateConfidence(frequency: number): number {
    if (this.totalWords === 0) return 0;
    return Math.min(frequency / this.totalWords, 1);
  }
}
