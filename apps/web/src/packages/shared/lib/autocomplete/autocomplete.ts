import { editCost } from './keyboard-layout';
import { LayeredAutocomplete, type BlendWeights } from './layered-autocomplete';
import { NgramModel } from './ngram-model';
import {
  toEngineSnapshot,
  type AnyEngineSnapshot,
  type EngineSnapshot,
} from './persistence';
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

export interface ObserveOptions {
  /** If provided, updates both the global user layer and this chat's layer. */
  chatId?: string;
  /** Explicit observation time (ms). Defaults to Date.now(). */
  atMs?: number;
}

export interface ChatScopeOptions {
  /** If provided, the chat layer for this id participates in scoring. */
  chatId?: string;
}

export interface SuggestWordOptions extends ChatScopeOptions {
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

export interface AutocompleteOptions {
  /** Max n-gram order for every layer. Default 5. */
  order?: number;
  /** Stupid Backoff λ for every layer. Default 0.4. */
  lambda?: number;
  /**
   * Half-life for recency decay on the user + chat layers (ms).
   * `Infinity` (default) disables decay entirely.
   */
  halfLifeMs?: number;
  /** Per-layer weights for blended scoring. */
  blend?: Partial<BlendWeights>;
  /** Token threshold where the chat layer reaches full weight. Default 500. */
  chatAdaptiveThreshold?: number;
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
 * New in v2 (Phase 2):
 *   - Layered LM: the engine composes a shared `base` layer (seed corpus),
 *     a `user` layer (everything `observe()` has seen), and a per-chat
 *     layer keyed by `chatId`. Suggestions blend all three so predictions
 *     feel like the user in this conversation.
 *   - All methods that take context now accept `{ chatId }` — `observe`,
 *     `getNextWord`, `getNextWordAdvanced`, `suggestWord`, `getNextPhrase`.
 *   - Recency decay (`halfLifeMs`) de-weights stale n-grams exponentially
 *     so the model tracks what the user is saying *lately*.
 */
export class Autocomplete {
  private wordFrequency: Map<string, number>;
  private wordTrie: TrieNode;
  private layered: LayeredAutocomplete;
  private totalWords: number;
  private totalWordLength: number;
  private isTrained = false;

  private readonly order: number;
  private readonly lambda: number;
  private readonly halfLifeMs: number;
  private readonly blend: Partial<BlendWeights>;
  private readonly chatAdaptiveThreshold: number | undefined;

  constructor(opts: AutocompleteOptions = {}) {
    this.order = opts.order ?? 5;
    this.lambda = opts.lambda ?? 0.4;
    this.halfLifeMs = opts.halfLifeMs ?? Infinity;
    this.blend = opts.blend ?? {};
    this.chatAdaptiveThreshold = opts.chatAdaptiveThreshold;

    this.wordFrequency = new Map();
    this.wordTrie = new TrieNode();
    this.layered = this.createLayered();
    this.totalWords = 0;
    this.totalWordLength = 0;
  }

  // ─── Core API (v1 back-compat) ──────────────────────────────────────────

  train(corpus: string): void {
    if (!corpus || typeof corpus !== 'string') {
      throw new Error('Corpus must be a non-empty string');
    }
    this.clear();
    this.observeInternal(corpus, 'base');
    this.isTrained = true;
  }

  getCompletions(input: string): string[] {
    if (!this.isTrained) {
      throw new Error('Service must be trained before use');
    }
    if (!input || typeof input !== 'string') return [];
    return this.getCompletionsAdvanced(input).map(r => r.word);
  }

  getNextWord(sequence: string, opts: ChatScopeOptions = {}): string[] {
    if (!this.isTrained) {
      throw new Error('Service must be trained before use');
    }
    if (!sequence || typeof sequence !== 'string') return [];
    return this.getNextWordAdvanced(sequence, opts).map(r => r.word);
  }

  getNextPhrase(sequence: string, opts: ChatScopeOptions = {}): string[] {
    if (!this.isTrained) {
      throw new Error('Service must be trained before use');
    }
    if (!sequence || typeof sequence !== 'string') return [];
    return this.buildPhrases(sequence, opts);
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
      totalNGrams: this.totalNgrams(),
      averageWordFrequency:
        advanced.uniqueWords > 0 ? advanced.totalWords / advanced.uniqueWords : 0,
    };
  }

  // ─── New v2 API ──────────────────────────────────────────────────────────

  /**
   * Ingest text into the model incrementally. Unlike `train()`, prior
   * observations are retained. Tokenization is Unicode-aware (handles
   * emoji, contractions, CJK, sentence boundaries).
   *
   * Routing (Phase 2): without `chatId` → user layer. With `chatId` →
   * user + chat layer (chat-specific context accumulates there).
   */
  observe(text: string, opts: ObserveOptions = {}): void {
    this.observeInternal(text, opts);
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
    const chatId = opts.chatId;

    // Empty prefix → pure next-word prediction (if context) or nothing.
    if (prefix.length === 0) {
      if (!opts.context) return [];
      return this.topNextWords(opts.context, maxResults, { chatId }).map(p => ({
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
      const score = this.blendScore(word, frequency, contextTokens, 0, chatId);
      out.push({ word, frequency, score, fuzzy: false, editCost: 0 });
    }
    for (const { word, frequency, cost } of fuzzyHits) {
      const score = this.blendScore(word, frequency, contextTokens, cost, chatId);
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
    return toEngineSnapshot(this.layered);
  }

  /**
   * Restore engine state from a previously captured snapshot. Accepts
   * both v1 (Phase 1, single-ngram) and v2 (Phase 2, layered) shapes.
   * Rebuilds the trie and word-frequency map from the union of all layer
   * unigram rows, so callers get prefix completion across personalization.
   */
  restoreFromSnapshot(snapshot: AnyEngineSnapshot): void {
    this.clear();
    if (snapshot.version === 1) {
      const base = NgramModel.deserialize(snapshot.ngram);
      this.layered = this.createLayered({ base });
      this.indexUnigramsIntoTrie(base);
    } else {
      const base = NgramModel.deserialize(snapshot.base);
      const user = NgramModel.deserialize(snapshot.user);
      const chats = new Map<string, NgramModel>();
      for (const [chatId, ng] of Object.entries(snapshot.chats)) {
        chats.set(chatId, NgramModel.deserialize(ng));
      }
      this.layered = this.createLayered({ base, user, chats });
      this.indexUnigramsIntoTrie(base);
      this.indexUnigramsIntoTrie(user);
      for (const m of chats.values()) this.indexUnigramsIntoTrie(m);
    }
    this.isTrained = this.totalWords > 0;
  }

  /**
   * Prune the user + all chat layers to cap memory. Base is intentionally
   * untouched — it's the static seed corpus. Call periodically (e.g. on
   * cold start or when a chat model exceeds its budget).
   */
  pruneLayers(caps: { user?: Record<number, number>; chat?: Record<number, number> }): void {
    if (caps.user) this.layered.user.prune(caps.user);
    if (caps.chat) {
      for (const chatId of this.layered.chatIds()) {
        const m = this.layered.getChat(chatId);
        m?.prune(caps.chat);
      }
    }
  }

  /** Apply recency decay to every non-base layer and recompute totals. */
  compact(nowMs: number = Date.now()): void {
    this.layered.user.compact(nowMs);
    for (const chatId of this.layered.chatIds()) {
      this.layered.getChat(chatId)?.compact(nowMs);
    }
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

  getNextWordAdvanced(
    context: string,
    options: PredictionOptions & ChatScopeOptions = {},
  ): PredictionResult[] {
    const { maxResults = 5, minFrequency = 0, chatId } = options;
    // useBigrams/useTrigrams from v1 are ignored — NgramModel uses backoff
    // across all orders automatically.
    if (!context) return [];

    const tokens = this.contextTokens(context);
    if (tokens.length === 0 && !context.includes('<s>')) return [];

    const preds = this.layered.topK(tokens, maxResults, { chatId });
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
    // Per-order counts across all layers.
    let bigramCount = 0;
    let trigramCount = 0;
    const allModels = [this.layered.base, this.layered.user];
    for (const chatId of this.layered.chatIds()) {
      const m = this.layered.getChat(chatId);
      if (m) allModels.push(m);
    }
    for (const m of allModels) {
       
      const countsAny = (m as unknown as { counts: Map<string, Map<string, number>>[] }).counts;
      bigramCount += countsAny[2]?.size ?? 0;
      trigramCount += countsAny[3]?.size ?? 0;
    }
    return {
      totalWords: this.totalWords,
      uniqueWords: this.wordFrequency.size,
      bigramCount,
      trigramCount,
      averageWordLength: this.totalWords > 0 ? this.totalWordLength / this.totalWords : 0,
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
    this.layered = this.createLayered();
    this.totalWords = 0;
    this.totalWordLength = 0;
    this.isTrained = false;
  }

  // ─── Internals ───────────────────────────────────────────────────────────

  private createLayered(seed?: {
    base?: NgramModel;
    user?: NgramModel;
    chats?: Map<string, NgramModel>;
  }): LayeredAutocomplete {
    const base =
      seed?.base ??
      // Base never decays — it's the shared seed corpus, frozen post-train.
      new NgramModel({ order: this.order, lambda: this.lambda, halfLifeMs: Infinity });
    const user =
      seed?.user ??
      new NgramModel({ order: this.order, lambda: this.lambda, halfLifeMs: this.halfLifeMs });
    return new LayeredAutocomplete({
      base,
      user,
      chats: seed?.chats,
      blend: this.blend,
      chatAdaptiveThreshold: this.chatAdaptiveThreshold,
      chatFactory: () =>
        new NgramModel({ order: this.order, lambda: this.lambda, halfLifeMs: this.halfLifeMs }),
    });
  }

  /** Route observation to `base` or to `user + chat?` per scope. */
  private observeInternal(text: string, scope: ObserveOptions | 'base'): void {
    if (!text || typeof text !== 'string') return;
    const tokens = tokenize(text);
    if (tokens.length === 0) return;

    // Model learns from words, emoji, and sentence-boundary markers. Raw
    // punctuation is intentionally dropped — its semantic contribution was
    // already captured by the tokenizer turning terminators into `</s>`.
    const stream = tokens.filter(t => t.kind !== 'punct').map(t => t.normalized);

    if (scope === 'base') {
      this.layered.observeBase(stream);
    } else {
      const atMs = scope.atMs ?? Date.now();
      this.layered.observeAt(stream, atMs, { chatId: scope.chatId });
    }

    // Trie and word-frequency map get fed from every layer — callers need
    // to complete prefixes of words seen anywhere, regardless of layer.
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

  private indexUnigramsIntoTrie(model: NgramModel): void {
     
    const counts = (model as unknown as { counts: Map<string, Map<string, number>>[] }).counts;
    const row = counts[1]?.get('');
    if (!row) return;
    for (const [word, count] of row) {
      if (word === '<s>' || word === '</s>') continue;
      const add = Math.max(1, Math.round(count));
      this.wordFrequency.set(word, (this.wordFrequency.get(word) ?? 0) + add);
      this.wordTrie.insert(word, add);
      this.totalWords += add;
      this.totalWordLength += word.length * add;
    }
  }

  private totalNgrams(): number {
    const allModels = [this.layered.base, this.layered.user];
    for (const chatId of this.layered.chatIds()) {
      const m = this.layered.getChat(chatId);
      if (m) allModels.push(m);
    }
    return allModels.reduce((sum, m) => sum + m.stats.ngramCount, 0);
  }

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

  private topNextWords(contextText: string, k: number, opts: ChatScopeOptions) {
    const tokens = this.contextTokens(contextText);
    return this.layered.topK(tokens, k, { chatId: opts.chatId });
  }

  private blendScore(
    word: string,
    frequency: number,
    contextTokens: readonly string[],
    editPenalty: number,
    chatId: string | undefined,
  ): number {
    const uniBase = this.totalWords > 0 ? frequency / this.totalWords : 0;
    const ctxBoost =
      contextTokens.length > 0 ? this.layered.score(contextTokens, word, { chatId }) : 0;
    // 60% weight on context (higher-order evidence, already layered-blended)
    // and 40% on unigram prior. Matches the Ouyang et al. (Gboard) ratio.
    const blended = 0.6 * ctxBoost + 0.4 * uniBase;
    return blended * Math.exp(-0.3 * editPenalty);
  }

  private buildPhrases(sequence: string, opts: ChatScopeOptions): string[] {
    const startingWords = this.getNextWordAdvanced(sequence, opts);
    const phrases = new Map<string, number>();

    for (const { word: first, frequency: firstFreq } of startingWords) {
      for (const len of [1, 2, 3] as const) {
        const built = this.extendPhrase([first], len, opts);
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

  private extendPhrase(
    start: readonly string[],
    extraWords: number,
    opts: ChatScopeOptions,
  ): string[][] {
    if (extraWords === 0) return [start.slice()];

    const preds = this.layered.topK(start, 5, { chatId: opts.chatId });
    const out: string[][] = [];
    for (const { word } of preds) {
      const extended = [...start, word];
      if (extraWords === 1) {
        out.push(extended);
      } else {
        out.push(...this.extendPhrase(extended, extraWords - 1, opts));
      }
    }
    return out;
  }

  private calculateConfidence(frequency: number): number {
    if (this.totalWords === 0) return 0;
    return Math.min(frequency / this.totalWords, 1);
  }
}
