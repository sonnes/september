/**
 * An n-gram language model with Stupid Backoff (Brants et al. 2007).
 *
 *   score(w | c) = count(c, w) / count(c)      if count(c, w) > 0
 *                = λ · score(w | c[1:])         otherwise
 *
 * λ is 0.4, as in the paper. The order is 5, because spoken messages such as
 * "I'm not feeling well today" carry 4-gram and 5-gram structure.
 */

const ORDER = 5;
const LAMBDA = 0.4;
const SENTENCE_MARKS: ReadonlySet<string> = new Set(['<s>', '</s>']);

export interface NgramPrediction {
  word: string;
  score: number;
}

export class NgramModel {
  /** counts[n]: context of n - 1 words, then word, then count. */
  private readonly counts: Map<string, Map<string, number>>[] = [];
  private readonly contextTotals: Map<string, number>[] = [];
  private tokens = 0;

  constructor() {
    for (let n = 1; n <= ORDER; n++) {
      this.counts[n] = new Map();
      this.contextTotals[n] = new Map();
    }
  }

  get totalTokens(): number {
    return this.tokens;
  }

  observe(tokens: readonly string[]): void {
    this.tokens += tokens.length;
    for (let n = 1; n <= ORDER; n++) {
      for (let i = 0; i + n <= tokens.length; i++) {
        const context = tokens.slice(i, i + n - 1).join(' ');
        const word = tokens[i + n - 1];
        let row = this.counts[n].get(context);
        if (!row) {
          row = new Map();
          this.counts[n].set(context, row);
        }
        row.set(word, (row.get(word) ?? 0) + 1);
        this.contextTotals[n].set(context, (this.contextTotals[n].get(context) ?? 0) + 1);
      }
    }
  }

  score(context: readonly string[], word: string): number {
    return this.scoreWithOrder(context, word).score;
  }

  /** The best next words, without the sentence marks. */
  topK(context: readonly string[], k: number): NgramPrediction[] {
    if (k <= 0 || this.tokens === 0) return [];

    const candidates = new Set<string>();
    for (let n = Math.min(ORDER, context.length + 1); n >= 1; n--) {
      const row = this.counts[n].get(context.slice(context.length - (n - 1)).join(' '));
      if (row) for (const word of row.keys()) candidates.add(word);
    }

    const out: (NgramPrediction & { order: number })[] = [];
    for (const word of candidates) {
      if (SENTENCE_MARKS.has(word)) continue;
      const { score, order } = this.scoreWithOrder(context, word);
      if (score > 0) out.push({ word, score, order });
    }
    out.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.order !== a.order) return b.order - a.order;
      return a.word < b.word ? -1 : a.word > b.word ? 1 : 0;
    });
    return out.slice(0, k).map(({ word, score }) => ({ word, score }));
  }

  private scoreWithOrder(
    context: readonly string[],
    word: string,
  ): { score: number; order: number } {
    let backoff = 1;
    for (let n = Math.min(ORDER, context.length + 1); n >= 1; n--) {
      const key = context.slice(context.length - (n - 1)).join(' ');
      const count = this.counts[n].get(key)?.get(word) ?? 0;
      if (count > 0) {
        return { score: (backoff * count) / this.contextTotals[n].get(key)!, order: n };
      }
      backoff *= LAMBDA;
    }
    return { score: 0, order: 0 };
  }
}
