/**
 * N-gram language model with Stupid Backoff smoothing and optional
 * recency decay.
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
 *
 * # Phase 2: recency decay
 *
 * When `halfLifeMs` is finite, each stored count is implicitly weighted by
 * how recently it was last touched. On observe we apply
 *   new = old · exp(-ln2 · Δt / halfLife) + 1
 * so a phrase said 60 days ago and said again today counts as 1.5, not 2.
 * `Infinity` disables decay and is the Phase 1 behaviour (back-compat).
 *
 * Between compactions, `contextTotals` drift — we only update the total by
 * the per-entry delta, not by re-ageing the whole row. The drift is
 * bounded by the total age covered since the last `compact()` call, and
 * compaction rebuilds everything consistently.
 */

import {
  DEFAULT_DECAY_SKIP_WINDOW_MS,
  decayCount,
  shouldSkipDecay,
} from './recency';

export interface NgramModelOptions {
  /** Maximum n-gram order. Default 5. */
  order?: number;
  /** Stupid Backoff discount factor. Default 0.4. */
  lambda?: number;
  /**
   * Half-life for exponential recency decay, in ms. `Infinity` (default)
   * disables decay entirely — counts are purely additive.
   */
  halfLifeMs?: number;
  /**
   * Δt below which decay is skipped as a no-op. Observations inside this
   * window stay integer-counted. Default 1 hour.
   */
  decaySkipWindowMs?: number;
}

export interface NgramPrediction {
  word: string;
  score: number;
  /** Which n actually produced the score (after backoff). 1 = unigram. */
  order: number;
}

/**
 * v1 snapshot — Phase 1 compatible. No timestamps, no decay.
 * v2 snapshot — Phase 2 and later. Adds timestamps + halfLifeMs.
 *
 * New writers always emit v2 when decay is enabled and v1 otherwise, so
 * older readers stay functional on counts-only snapshots.
 */
export interface SerializedNgramV1 {
  version: 1;
  order: number;
  lambda: number;
  totalTokens: number;
  counts: Array<Array<[string, Array<[string, number]>]>>;
}

export interface SerializedNgramV2 {
  version: 2;
  order: number;
  lambda: number;
  totalTokens: number;
  halfLifeMs: number;
  counts: Array<Array<[string, Array<[string, number]>]>>;
  /**
   * Parallel to `counts`: [contextKey, [[word, lastUpdatedMs][]][]] per order.
   * Entries whose count got to the model via a non-decayed pre-decay snapshot
   * may be absent — in that case `observeAt` treats them as fresh.
   */
  timestamps: Array<Array<[string, Array<[string, number]>]>>;
}

export type SerializedNgram = SerializedNgramV1 | SerializedNgramV2;

/** Caps per-order during pruning. Missing orders are left untouched. */
export type MaxPerOrder = Record<number, number>;

const SYNTHETIC_TOKENS: ReadonlySet<string> = new Set(['<s>', '</s>']);

export class NgramModel {
  readonly order: number;
  readonly lambda: number;
  readonly halfLifeMs: number;
  readonly decaySkipWindowMs: number;

  /** counts[n] : Map<contextKey, Map<word, count>>. Index 0 unused. */
  private readonly counts: Map<string, Map<string, number>>[];
  /** contextTotals[n] : Map<contextKey, Σ count>. Index 0 unused. */
  private readonly contextTotals: Map<string, number>[];
  /**
   * timestamps[n] : Map<contextKey, Map<word, lastUpdatedMs>>. Only
   * populated when decay is enabled. Index 0 unused.
   */
  private readonly timestamps: Map<string, Map<string, number>>[];

  private totalTokens = 0;
  private vocab: Set<string> = new Set();

  constructor(opts: NgramModelOptions = {}) {
    this.order = opts.order ?? 5;
    this.lambda = opts.lambda ?? 0.4;
    this.halfLifeMs = opts.halfLifeMs ?? Infinity;
    this.decaySkipWindowMs = opts.decaySkipWindowMs ?? DEFAULT_DECAY_SKIP_WINDOW_MS;
    if (this.order < 1) throw new Error('NgramModel order must be ≥ 1');

    this.counts = new Array(this.order + 1);
    this.contextTotals = new Array(this.order + 1);
    this.timestamps = new Array(this.order + 1);
    for (let n = 1; n <= this.order; n++) {
      this.counts[n] = new Map();
      this.contextTotals[n] = new Map();
      this.timestamps[n] = new Map();
    }
  }

  /** True when recency decay is active. */
  get decayEnabled(): boolean {
    return Number.isFinite(this.halfLifeMs) && this.halfLifeMs > 0;
  }

  /**
   * Incorporate a token stream into the counts at `Date.now()`. Callers
   * may pass a full sentence or a fragment — n-grams spanning neither end
   * are extracted with a sliding window. Re-invocation is additive; no
   * full retrain needed.
   */
  observe(tokens: readonly string[]): void {
    this.observeAt(tokens, Date.now());
  }

  /**
   * Same as `observe` but with an explicit observation time (ms). Used
   * internally by `observe` and exposed for tests + historical replay.
   */
  observeAt(tokens: readonly string[], atMs: number): void {
    if (tokens.length === 0) return;
    for (const t of tokens) this.vocab.add(t);
    this.totalTokens += tokens.length;

    const decayOn = this.decayEnabled;

    for (let n = 1; n <= this.order; n++) {
      const countsN = this.counts[n];
      const totalsN = this.contextTotals[n];
      const timesN = decayOn ? this.timestamps[n] : null;

      for (let i = 0; i + n <= tokens.length; i++) {
        const ctx = n > 1 ? tokens.slice(i, i + n - 1).join(' ') : '';
        const w = tokens[i + n - 1];

        let row = countsN.get(ctx);
        if (!row) {
          row = new Map();
          countsN.set(ctx, row);
        }

        const prevCount = row.get(w) ?? 0;
        let effectivePrev = prevCount;

        if (decayOn && prevCount > 0 && timesN) {
          const timeRow = timesN.get(ctx);
          const prevTs = timeRow?.get(w) ?? atMs;
          if (!shouldSkipDecay(prevTs, atMs, this.halfLifeMs, this.decaySkipWindowMs)) {
            effectivePrev = decayCount(prevCount, atMs - prevTs, this.halfLifeMs);
          }
        }

        const newCount = effectivePrev + 1;
        row.set(w, newCount);

        const delta = newCount - prevCount;
        totalsN.set(ctx, (totalsN.get(ctx) ?? 0) + delta);

        if (decayOn && timesN) {
          let timeRow = timesN.get(ctx);
          if (!timeRow) {
            timeRow = new Map();
            timesN.set(ctx, timeRow);
          }
          timeRow.set(w, atMs);
        }
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

  /** Raw stored n-gram count (no decay, no backoff). 0 if absent. */
  count(context: readonly string[], word: string): number {
    const n = context.length + 1;
    if (n < 1 || n > this.order) return 0;
    const ctx = n > 1 ? context.join(' ') : '';
    const row = this.counts[n]?.get(ctx);
    return row?.get(word) ?? 0;
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

  /**
   * Drop the lowest-count n-grams per order until each order is at or
   * below its cap. When an entry is dropped its contribution is also
   * removed from the contextTotal. Unigrams are never pruned below the
   * synthetic vocab (`<s>`/`</s>`) since backoff relies on them.
   *
   * `maxPerOrder` is keyed by n (1 = unigram). Orders not listed are
   * untouched.
   */
  prune(maxPerOrder: MaxPerOrder): void {
    for (const [orderStr, max] of Object.entries(maxPerOrder)) {
      const n = Number(orderStr);
      if (!Number.isInteger(n) || n < 1 || n > this.order) continue;
      if (max < 0) continue;

      const allEntries: Array<{ ctx: string; word: string; count: number }> = [];
      for (const [ctx, row] of this.counts[n]) {
        for (const [word, count] of row) {
          allEntries.push({ ctx, word, count });
        }
      }
      if (allEntries.length <= max) continue;

      allEntries.sort((a, b) => a.count - b.count);
      const dropCount = allEntries.length - max;
      for (let i = 0; i < dropCount; i++) {
        const e = allEntries[i];
        const row = this.counts[n].get(e.ctx);
        if (!row) continue;
        row.delete(e.word);
        if (row.size === 0) this.counts[n].delete(e.ctx);
        this.contextTotals[n].set(
          e.ctx,
          (this.contextTotals[n].get(e.ctx) ?? 0) - e.count,
        );
        if ((this.contextTotals[n].get(e.ctx) ?? 0) <= 0) {
          this.contextTotals[n].delete(e.ctx);
        }
        const times = this.timestamps[n]?.get(e.ctx);
        if (times) {
          times.delete(e.word);
          if (times.size === 0) this.timestamps[n].delete(e.ctx);
        }
      }
    }
  }

  /**
   * Apply accumulated recency decay to every stored entry so the model
   * is internally consistent at `nowMs`. Recomputes `contextTotals` from
   * scratch and resets every timestamp to `nowMs`. A no-op when decay is
   * disabled.
   */
  compact(nowMs: number = Date.now()): void {
    if (!this.decayEnabled) return;
    for (let n = 1; n <= this.order; n++) {
      const countsN = this.counts[n];
      const totalsN = this.contextTotals[n];
      const timesN = this.timestamps[n];

      totalsN.clear();
      for (const [ctx, row] of countsN) {
        let newTotal = 0;
        const timeRow = timesN.get(ctx);
        for (const [w, c] of row) {
          const lastTs = timeRow?.get(w) ?? nowMs;
          const decayed = decayCount(c, nowMs - lastTs, this.halfLifeMs);
          row.set(w, decayed);
          newTotal += decayed;
        }
        totalsN.set(ctx, newTotal);

        // Reset timestamps — every entry is now fresh relative to nowMs.
        if (timeRow) {
          for (const w of row.keys()) timeRow.set(w, nowMs);
        } else {
          const newTimes = new Map<string, number>();
          for (const w of row.keys()) newTimes.set(w, nowMs);
          timesN.set(ctx, newTimes);
        }
      }
    }
  }

  serialize(): SerializedNgram {
    const counts: SerializedNgramV1['counts'] = [];
    for (let n = 1; n <= this.order; n++) {
      const rows: Array<[string, Array<[string, number]>]> = [];
      for (const [ctx, row] of this.counts[n]) rows.push([ctx, [...row]]);
      counts.push(rows);
    }

    if (!this.decayEnabled) {
      return {
        version: 1,
        order: this.order,
        lambda: this.lambda,
        totalTokens: this.totalTokens,
        counts,
      };
    }

    const timestamps: SerializedNgramV2['timestamps'] = [];
    for (let n = 1; n <= this.order; n++) {
      const rows: Array<[string, Array<[string, number]>]> = [];
      for (const [ctx, row] of this.timestamps[n]) rows.push([ctx, [...row]]);
      timestamps.push(rows);
    }
    return {
      version: 2,
      order: this.order,
      lambda: this.lambda,
      totalTokens: this.totalTokens,
      halfLifeMs: this.halfLifeMs,
      counts,
      timestamps,
    };
  }

  static deserialize(s: SerializedNgram): NgramModel {
    if (s.version !== 1 && s.version !== 2) {
      throw new Error(
        `Unsupported NgramModel snapshot version: ${(s as { version: unknown }).version}`,
      );
    }
    const halfLifeMs = s.version === 2 ? s.halfLifeMs : Infinity;
    const m = new NgramModel({ order: s.order, lambda: s.lambda, halfLifeMs });
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
      if (s.version === 2) {
        const tsRows = s.timestamps[n - 1] ?? [];
        for (const [ctx, pairs] of tsRows) {
          m.timestamps[n].set(ctx, new Map(pairs));
        }
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
