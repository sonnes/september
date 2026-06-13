import { describe, expect, it } from 'vitest';

import { LayeredAutocomplete } from './layered-autocomplete';
import { NgramModel } from './ngram-model';

function trained(tokens: readonly string[][]): NgramModel {
  const m = new NgramModel({ order: 3 });
  for (const s of tokens) m.observe(s);
  return m;
}

describe('LayeredAutocomplete', () => {
  describe('base-only setup', () => {
    it('blended score equals α_base · S_base when user/chat are empty', () => {
      const base = trained([['<s>', 'hi', 'there', '</s>']]);
      const layered = new LayeredAutocomplete({
        base,
        user: new NgramModel({ order: 3 }),
        blend: { base: 1, user: 2, chat: 3 },
      });

      const blended = layered.score(['hi'], 'there');
      const expected = 1 * base.score(['hi'], 'there');
      expect(blended).toBeCloseTo(expected, 10);
    });
  });

  describe('user layer', () => {
    it('personal phrase surfaces in topK after enough observations', () => {
      const base = trained([
        ['<s>', 'on', 'monday', '</s>'],
        ['<s>', 'on', 'monday', '</s>'],
      ]);
      const user = new NgramModel({ order: 3 });
      const layered = new LayeredAutocomplete({ base, user });

      // Before user observations, topK is base-dominated.
      expect(layered.topK(['on'], 3)[0]?.word).toBe('monday');

      // User says "on Tuesday" three times.
      for (let i = 0; i < 3; i++) user.observe(['<s>', 'on', 'tuesday', '</s>']);
      const top = layered.topK(['on'], 3);
      expect(top.map(p => p.word)).toContain('tuesday');
      expect(top[0]?.word).toBe('tuesday');
    });
  });

  describe('chat layer', () => {
    it('is adaptive: below threshold the chat weight is scaled down', () => {
      const base = new NgramModel({ order: 3 });
      const user = new NgramModel({ order: 3 });
      const layered = new LayeredAutocomplete({
        base,
        user,
        blend: { base: 1, user: 2, chat: 3 },
        chatAdaptiveThreshold: 500,
      });

      // A chat with zero tokens contributes zero effective weight.
      expect(layered.chatEffectiveWeight('empty')).toBe(0);

      // Seed chat 'A' with 250 tokens (half the threshold) — should contribute
      // half of α_chat, i.e. 1.5.
      const chatA = layered.ensureChat('A');
      for (let i = 0; i < 125; i++) chatA.observe(['hi', 'there']); // 2 tokens × 125 = 250
      expect(layered.chatEffectiveWeight('A')).toBeCloseTo(1.5, 6);

      // Seed chat 'B' with 1000 tokens → full α_chat = 3.
      const chatB = layered.ensureChat('B');
      for (let i = 0; i < 500; i++) chatB.observe(['ok', 'cool']);
      expect(layered.chatEffectiveWeight('B')).toBeCloseTo(3, 6);
    });

    it('chat-specific vocabulary dominates when the context matches', () => {
      const base = trained([
        ['<s>', 'see', 'you', 'at', 'the', 'meeting', '</s>'],
        ['<s>', 'see', 'you', 'at', 'the', 'meeting', '</s>'],
      ]);
      const user = trained([
        ['<s>', 'see', 'you', 'at', 'the', 'meeting', '</s>'],
      ]);
      const layered = new LayeredAutocomplete({
        base,
        user,
        blend: { base: 1, user: 2, chat: 3 },
        chatAdaptiveThreshold: 10, // small threshold so chat layer is "hot" fast
      });
      const chatA = layered.ensureChat('A');
      for (let i = 0; i < 10; i++)
        chatA.observe(['<s>', 'see', 'you', 'at', 'the', 'game', 'night', '</s>']);

      const top = layered.topK(['at', 'the'], 3, { chatId: 'A' });
      expect(top[0]?.word).toBe('game');

      // Same context but different chatId (no history) → falls back to
      // base + user, where "meeting" wins.
      const topB = layered.topK(['at', 'the'], 3, { chatId: 'B' });
      expect(topB[0]?.word).toBe('meeting');
    });

    it('unknown chatId returns blended (base + user) without crashing', () => {
      const base = trained([['<s>', 'hello', 'world', '</s>']]);
      const user = trained([['<s>', 'hello', 'world', '</s>']]);
      const layered = new LayeredAutocomplete({ base, user });

      const top = layered.topK(['hello'], 2, { chatId: 'never-seen' });
      expect(top[0]?.word).toBe('world');
      expect(top.every(p => Number.isFinite(p.score))).toBe(true);
    });
  });

  describe('observe routing', () => {
    it('observe() with no chatId updates user layer only', () => {
      const base = new NgramModel({ order: 2 });
      const user = new NgramModel({ order: 2 });
      const layered = new LayeredAutocomplete({ base, user });

      layered.observe(['hi', 'there']);
      expect(user.stats.totalTokens).toBe(2);
      expect(base.stats.totalTokens).toBe(0);
      expect(layered.chatIds()).toEqual([]);
    });

    it('observe() with chatId updates user AND that chat, not others', () => {
      const layered = new LayeredAutocomplete({
        base: new NgramModel({ order: 2 }),
        user: new NgramModel({ order: 2 }),
      });
      layered.observe(['hi'], { chatId: 'A' });
      layered.observe(['yo'], { chatId: 'B' });

      expect(layered.user.stats.totalTokens).toBe(2);
      expect(layered.getChat('A')?.stats.totalTokens).toBe(1);
      expect(layered.getChat('B')?.stats.totalTokens).toBe(1);
      expect(layered.getChat('A')?.count([], 'yo')).toBe(0);
    });
  });

  describe('observation time', () => {
    it('observeAt threads the timestamp into layered model observations', () => {
      const layered = new LayeredAutocomplete({
        base: new NgramModel({ order: 2 }),
        user: new NgramModel({ order: 2 }),
        chatFactory: () => new NgramModel({ order: 2, halfLifeMs: 60 * 24 * 60 * 60 * 1000 }),
      });
      layered.observeAt(['hi'], 0, { chatId: 'A' });
      layered.observeAt(['hi'], 60 * 24 * 60 * 60 * 1000, { chatId: 'A' });
      // Chat A was created via the factory with decay enabled → count 1.5.
      expect(layered.getChat('A')?.count([], 'hi')).toBeCloseTo(1.5, 6);
    });
  });
});
