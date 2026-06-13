/**
 * Multi-layer language model orchestrator.
 *
 *   final_score(w | c) =   α_base · S_base(w | c)
 *                        + α_user · S_user(w | c)
 *                        + α_chat · S_chat(w | c, chatId)
 *
 * where each `S_*` is the Stupid Backoff score from an underlying
 * `NgramModel`. Per-layer defaults:
 *
 *   α_base = 1.0   (shared seed corpus; never grows after training)
 *   α_user = 2.0   (user's aggregate history; routes from every observe())
 *   α_chat = 3.0   (per-recipient; scaled *down* when the chat is young)
 *
 * The chat weight is "adaptive": a brand-new chat with 3 observations of
 * "ok" shouldn't drown out base+user. We linearly interpolate the effective
 * α_chat from 0 up to the configured value over the first `chatAdaptiveThreshold`
 * tokens (default 500). User and base layers use their configured weights
 * directly.
 *
 * The orchestrator does *not* own persistence — that stays in `persistence.ts`
 * and the hook.
 */

import { NgramModel, type NgramPrediction } from './ngram-model';

export interface BlendWeights {
  base: number;
  user: number;
  chat: number;
}

export const DEFAULT_BLEND: BlendWeights = Object.freeze({ base: 1, user: 2, chat: 3 });
export const DEFAULT_CHAT_ADAPTIVE_THRESHOLD = 500;

export interface LayeredAutocompleteOptions {
  base: NgramModel;
  user: NgramModel;
  /** Pre-loaded chat models, keyed by chatId. Optional. */
  chats?: Map<string, NgramModel>;
  /** Per-layer weights. Partial overrides merge with the defaults. */
  blend?: Partial<BlendWeights>;
  /** Token count at which the chat layer contributes its full weight. */
  chatAdaptiveThreshold?: number;
  /**
   * Factory for new chat models, invoked on first `observe()` / `ensureChat()`
   * for a chatId not already in the map. Defaults to a matching-order
   * `NgramModel` inheriting decay + lambda from the `user` layer.
   */
  chatFactory?: () => NgramModel;
}

export interface ObserveOptions {
  chatId?: string;
}

export interface ScoreOptions {
  chatId?: string;
}

const SYNTHETIC_TOKENS: ReadonlySet<string> = new Set(['<s>', '</s>']);

export class LayeredAutocomplete {
  readonly blend: BlendWeights;
  readonly chatAdaptiveThreshold: number;

  readonly base: NgramModel;
  readonly user: NgramModel;
  private readonly chats: Map<string, NgramModel>;
  private readonly chatFactory: () => NgramModel;

  constructor(opts: LayeredAutocompleteOptions) {
    this.base = opts.base;
    this.user = opts.user;
    this.chats = opts.chats ?? new Map();
    this.blend = { ...DEFAULT_BLEND, ...(opts.blend ?? {}) };
    this.chatAdaptiveThreshold = opts.chatAdaptiveThreshold ?? DEFAULT_CHAT_ADAPTIVE_THRESHOLD;
    this.chatFactory =
      opts.chatFactory ??
      (() =>
        new NgramModel({
          order: this.user.order,
          lambda: this.user.lambda,
          halfLifeMs: this.user.halfLifeMs,
          decaySkipWindowMs: this.user.decaySkipWindowMs,
        }));
  }

  // ─── chat model registry ────────────────────────────────────────────────

  getChat(chatId: string): NgramModel | undefined {
    return this.chats.get(chatId);
  }

  /** Get-or-create semantics. Always returns a model. */
  ensureChat(chatId: string): NgramModel {
    let m = this.chats.get(chatId);
    if (!m) {
      m = this.chatFactory();
      this.chats.set(chatId, m);
    }
    return m;
  }

  /** Inject an already-loaded chat model (used on rehydrate-from-IDB). */
  setChat(chatId: string, model: NgramModel): void {
    this.chats.set(chatId, model);
  }

  /** Remove a chat model from the working set. Returns true if present. */
  removeChat(chatId: string): boolean {
    return this.chats.delete(chatId);
  }

  chatIds(): string[] {
    return [...this.chats.keys()];
  }

  // ─── observation ────────────────────────────────────────────────────────

  observe(tokens: readonly string[], opts: ObserveOptions = {}): void {
    this.observeAt(tokens, Date.now(), opts);
  }

  observeAt(tokens: readonly string[], atMs: number, opts: ObserveOptions = {}): void {
    if (tokens.length === 0) return;
    this.user.observeAt(tokens, atMs);
    if (opts.chatId !== undefined) {
      this.ensureChat(opts.chatId).observeAt(tokens, atMs);
    }
  }

  /** Feed training data directly into the base layer. */
  observeBase(tokens: readonly string[]): void {
    this.base.observe(tokens);
  }

  // ─── scoring ────────────────────────────────────────────────────────────

  /**
   * Effective α_chat for a given chat, adapted by how much history it
   * has. Returns 0 for unknown chat ids.
   */
  chatEffectiveWeight(chatId: string | undefined): number {
    if (chatId === undefined) return 0;
    const m = this.chats.get(chatId);
    if (!m) return 0;
    const tokens = m.stats.totalTokens;
    if (tokens <= 0) return 0;
    const ratio = Math.min(1, tokens / this.chatAdaptiveThreshold);
    return this.blend.chat * ratio;
  }

  score(context: readonly string[], word: string, opts: ScoreOptions = {}): number {
    const base = this.base.score(context, word);
    const user = this.user.score(context, word);
    const chatModel = opts.chatId ? this.chats.get(opts.chatId) : undefined;
    const chat = chatModel ? chatModel.score(context, word) : 0;
    const chatW = this.chatEffectiveWeight(opts.chatId);
    return this.blend.base * base + this.blend.user * user + chatW * chat;
  }

  topK(context: readonly string[], k: number, opts: ScoreOptions = {}): NgramPrediction[] {
    if (k <= 0) return [];

    // Gather candidate words from each layer's topK.
    const pool = new Set<string>();
    const addFromLayer = (m: NgramModel) => {
      if (m.stats.totalTokens === 0) return;
      for (const p of m.topK(context, Math.max(k * 4, 20))) pool.add(p.word);
    };
    addFromLayer(this.base);
    addFromLayer(this.user);
    const chatModel = opts.chatId ? this.chats.get(opts.chatId) : undefined;
    if (chatModel) addFromLayer(chatModel);

    if (pool.size === 0) return [];

    const out: NgramPrediction[] = [];
    for (const w of pool) {
      if (SYNTHETIC_TOKENS.has(w)) continue;
      const score = this.score(context, w, opts);
      if (score > 0) out.push({ word: w, score, order: 0 });
    }

    out.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.word < b.word ? -1 : a.word > b.word ? 1 : 0;
    });
    return out.slice(0, k);
  }
}
