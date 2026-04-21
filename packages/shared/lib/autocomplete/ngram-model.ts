/**
 * N-gram language model with Stupid Backoff smoothing.
 *
 * Stupid Backoff (Brants et al. 2007) is the de facto standard smoothing for
 * large-data next-word prediction — simpler than Kneser-Ney, and when n-grams
 * are counted directly from user messages its quality is indistinguishable for
 * top-K word ranking (which is all we need; we're not doing perplexity-based
 * evaluation).
 *
 *   score(w | c) = count(c, w) / count(c)                           if > 0
 *                = λ · score(w | c[1:])                              otherwise
 *   score(w | ε) = count(w) / N                                     if > 0
 *                = λ · ε_uniform                                     otherwise
 *
 * We take λ = 0.4 by default, matching the original paper. The final
 * ε_uniform step is skipped because for top-K ranking we only care about
 * candidates we've actually seen — unseen words can't be ranked anyway.
 *
 * The `.order` governs the highest n used. For the assistive-typing app we
 * default to 5: messages like "I'm not feeling well today" have strong
 * 4-gram and 5-gram co-occurrence structure that bigrams+trigrams miss
 * entirely.
 */

export interface NgramModelOptions {
  /** Maximum n-gram order. Default 5. */
  order?: number;
  /** Stupid Backoff discount factor. Default 0.4. */
  lambda?: number;
}

export interface NgramPrediction {
  word: string;
  score: number;
  /** Which n actually produced the score (after backoff). 1 = unigram. */
  order: number;
}

export interface SerializedNgram {
  version: 1;
  order: number;
  lambda: number;
  totalTokens: number;
  /**
   * counts[n - 1] is a flat list of [contextKey, pairs] tuples for n-grams of
   * order n. contextKey is space-joined for n ≥ 2; '' for unigrams. pairs is
   * [word, count][].
   */
  counts: Array<Array<[string, Array<[string, number]>]>>;
}

const SYNTHETIC_TOKENS: ReadonlySet<string> = new Set(['<s>', '</s>']);

export class NgramModel {
  readonly order: number;
  readonly lambda: number;

  /** counts[n] : Map<contextKey, Map<word, count>>. Index 0 unused. */
  private readonly counts: Map<string, Map<string, number>>[];
  /** contextTotals[n] : Map<contextKey, Σ count>. Index 0 unused. */
  private readonly contextTotals: Map<string, number>[];

  private totalTokens = 0;
  private vocab: Set<string> = new Set();

  constructor(opts: NgramModelOptions = {}) {
    this.order = opts.order ?? 5;
    this.lambda = opts.lambda ?? 0.4;
    if (this.order < 1) throw new Error('NgramModel order must be ≥ 1');

    this.counts = new Array(this.order + 1);
    this.contextTotals = new Array(this.order + 1);
    for (let n = 1; n <= this.order; n++) {
      this.counts[n] = new Map();
      this.contextTotals[n] = new Map();
    }
  }

  /**
   * Incorporate a token stream into the counts. Callers may pass a full
   * sentence or a fragment — n-grams spanning neither end are extracted with a
   * sliding window. Re-invocation is additive; no full retrain needed.
   */
  observe(tokens: readonly string[]): void {
    if (tokens.length === 0) return;
    for (const t of tokens) this.vocab.add(t);
    this.totalTokens += tokens.length;

    for (let n = 1; n <= this.order; n++) {
      const countsN = this.counts[n];
      const totalsN = this.contextTotals[n];
      for (let i = 0; i + n <= tokens.length; i++) {
        const ctx = n > 1 ? tokens.slice(i, i + n - 1).join(' ') : '';
        const w = tokens[i + n - 1];
        let row = countsN.get(ctx);
        if (!row) {
          row = new Map();
          countsN.set(ctx, row);
        }
        row.set(w, (row.get(w) ?? 0) + 1);
        totalsN.set(ctx, (totalsN.get(ctx) ?? 0) + 1);
      }
    }
  }

  /**
   * Stupid-backoff score for (context, word). 0 if the word is unseen at every
   * order — callers treating the score as a probability should floor to a
   * small ε upstream.
   */
  score(context: readonly string[], word: string): number {
    return this.scoreWithOrder(context, word).score;
  }

  /**
   * Top-K next-word predictions ranked by Stupid-Backoff score. Synthetic
   * sentence-boundary tokens are never returned.
   */
  topK(context: readonly string[], k: number): NgramPrediction[] {
    if (k <= 0 || this.totalTokens === 0) return [];

    const candidates = new Set<string>();
    const maxN = Math.min(this.order, context.length + 1);
    for (let n = maxN; n >= 1; n--) {
      const startIdx = context.length - (n - 1);
      const ctx = n > 1 ? context.slice(startIdx).join(' ') : '';
      const row = this.counts[n]?.get(ctx);
      if (!row) continue;
      for (const w of row.keys()) candidates.add(w);
    }

    const out: NgramPrediction[] = [];
    for (const w of candidates) {
      if (SYNTHETIC_TOKENS.has(w)) continue;
      const { score, order } = this.scoreWithOrder(context, w);
      if (score > 0) out.push({ word: w, score, order });
    }
    out.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.order !== a.order) return b.order - a.order;
      return a.word < b.word ? -1 : a.word > b.word ? 1 : 0;
    });
    return out.slice(0, k);
  }

  get stats(): { totalTokens: number; vocabSize: number; ngramCount: number } {
    let ngramCount = 0;
    for (let n = 1; n <= this.order; n++) {
      for (const row of this.counts[n].values()) ngramCount += row.size;
    }
    // Vocab reporting excludes synthetic tokens so callers comparing against
    // corpus size aren't surprised by extra <s> / </s>.
    let vocabSize = 0;
    for (const t of this.vocab) if (!SYNTHETIC_TOKENS.has(t)) vocabSize++;
    return { totalTokens: this.totalTokens, vocabSize, ngramCount };
  }

  serialize(): SerializedNgram {
    const counts: SerializedNgram['counts'] = [];
    for (let n = 1; n <= this.order; n++) {
      const rows: Array<[string, Array<[string, number]>]> = [];
      for (const [ctx, row] of this.counts[n]) rows.push([ctx, [...row]]);
      counts.push(rows);
    }
    return {
      version: 1,
      order: this.order,
      lambda: this.lambda,
      totalTokens: this.totalTokens,
      counts,
    };
  }

  static deserialize(s: SerializedNgram): NgramModel {
    if (s.version !== 1) {
      throw new Error(`Unsupported NgramModel snapshot version: ${s.version}`);
    }
    const m = new NgramModel({ order: s.order, lambda: s.lambda });
    m.totalTokens = s.totalTokens;
    for (let n = 1; n <= s.order; n++) {
      const rows = s.counts[n - 1] ?? [];
      for (const [ctx, pairs] of rows) {
        const row = new Map(pairs);
        m.counts[n].set(ctx, row);
        let total = 0;
        for (const [w, c] of pairs) {
          total += c;
          m.vocab.add(w);
        }
        m.contextTotals[n].set(ctx, total);
        if (ctx) for (const t of ctx.split(' ')) m.vocab.add(t);
      }
    }
    return m;
  }

  private scoreWithOrder(
    context: readonly string[],
    word: string,
  ): { score: number; order: number } {
    const maxN = Math.min(this.order, context.length + 1);
    let backoff = 1;
    for (let n = maxN; n >= 1; n--) {
      const startIdx = context.length - (n - 1);
      const ctx = n > 1 ? context.slice(startIdx).join(' ') : '';
      const row = this.counts[n]?.get(ctx);
      if (row) {
        const c = row.get(word) ?? 0;
        if (c > 0) {
          const total = this.contextTotals[n].get(ctx) ?? 0;
          return { score: backoff * (c / total), order: n };
        }
      }
      backoff *= this.lambda;
    }
    return { score: 0, order: 0 };
  }
}
