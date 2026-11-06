import { NgramModel } from './ngram-model.ts';
import { tokenize } from './tokenizer.ts';

/** How much each model counts in a blended score. */
const WEIGHT = { base: 1, user: 2, space: 3 };
/** A space model reaches its full weight after this many tokens. */
const SPACE_FULL_WEIGHT_TOKENS = 500;
const SENTENCE_MARKS: ReadonlySet<string> = new Set(['<s>', '</s>']);
const ENDS_SENTENCE = /[.!?…。！？]\s*$/;

/**
 * Word completions and next-word predictions.
 *
 * Three n-gram models blend into one score: the seed sentences, everything
 * the user wrote, and what the user wrote in the current space. A young space
 * counts for less, so a few messages do not drown out the rest.
 */
export class Autocomplete {
  private readonly base = new NgramModel();
  private readonly user = new NgramModel();
  private readonly spaces = new Map<string, NgramModel>();
  private readonly frequency = new Map<string, number>();

  /**
   * The dictionary goes to the word counts only. A flat word list holds no
   * real pairs of words, so it never reaches an n-gram model. Its weight falls
   * as the square root of the rank, which is near the shape of word frequency
   * in English and leaves room for the words of the user to catch up.
   */
  constructor(corpus: string, dictionary: readonly string[] = []) {
    this.learn(corpus, [this.base]);
    const scale = 4 * dictionary.length;
    dictionary.forEach((word, index) => {
      const weight = Math.max(1, Math.round(Math.sqrt(scale / (index + 1))));
      this.count(word.toLowerCase(), weight);
    });
  }

  /** Learn from a message that the user wrote, in a space or outside one. */
  observe(text: string, spaceId?: string): void {
    const models = [this.user];
    if (spaceId !== undefined) {
      let space = this.spaces.get(spaceId);
      if (!space) {
        space = new NgramModel();
        this.spaces.set(spaceId, space);
      }
      models.push(space);
    }
    this.learn(text, models);
  }

  /** The known words that start with the prefix, most frequent first. */
  completions(prefix: string, limit: number): string[] {
    if (!prefix) return [];
    const lower = prefix.toLowerCase();
    return [...this.frequency]
      .filter(([word]) => word.startsWith(lower))
      .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
      .slice(0, limit)
      .map(([word]) => word);
  }

  /** The words most likely to follow the context, best first. */
  nextWords(context: string, limit: number, spaceId?: string): string[] {
    if (!context) return [];
    const tokens = this.contextTokens(context);
    if (tokens.length === 0 && !context.includes('<s>')) return [];

    const space = spaceId === undefined ? undefined : this.spaces.get(spaceId);
    const pool = new Set<string>();
    for (const model of [this.base, this.user, space]) {
      if (!model || model.totalTokens === 0) continue;
      for (const { word } of model.topK(tokens, Math.max(limit * 4, 20))) pool.add(word);
    }

    const spaceWeight = space
      ? WEIGHT.space * Math.min(1, space.totalTokens / SPACE_FULL_WEIGHT_TOKENS)
      : 0;
    const scored: { word: string; score: number }[] = [];
    for (const word of pool) {
      if (SENTENCE_MARKS.has(word)) continue;
      const score =
        WEIGHT.base * this.base.score(tokens, word) +
        WEIGHT.user * this.user.score(tokens, word) +
        spaceWeight * (space ? space.score(tokens, word) : 0);
      if (score > 0) scored.push({ word, score });
    }
    scored.sort((a, b) => b.score - a.score || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0));
    return scored.slice(0, limit).map(({ word }) => word);
  }

  private learn(text: string, models: NgramModel[]): void {
    const tokens = tokenize(text);
    if (tokens.length === 0) return;
    const stream = tokens.filter((t) => t.kind !== 'punct').map((t) => t.normalized);
    for (const model of models) model.observe(stream);
    for (const token of tokens) if (token.kind === 'word') this.count(token.normalized, 1);
  }

  private count(word: string, weight: number): void {
    this.frequency.set(word, (this.frequency.get(word) ?? 0) + weight);
  }

  /**
   * The context as model tokens. An unfinished sentence keeps its open start
   * mark and loses the closing one, so the model reads it as still going.
   */
  private contextTokens(text: string): string[] {
    const stream = tokenize(text)
      .filter((t) => t.kind !== 'punct')
      .map((t) => t.normalized);
    if (!ENDS_SENTENCE.test(text)) {
      while (stream.at(-1) === '</s>') stream.pop();
    }
    return stream;
  }
}
