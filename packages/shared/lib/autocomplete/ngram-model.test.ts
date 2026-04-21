import { describe, expect, it } from 'vitest';

import { NgramModel } from './ngram-model';

describe('NgramModel', () => {
  describe('empty state', () => {
    it('starts with zero stats', () => {
      const m = new NgramModel();
      expect(m.stats).toEqual({ totalTokens: 0, vocabSize: 0, ngramCount: 0 });
    });

    it('returns [] from topK and 0 from score', () => {
      const m = new NgramModel();
      expect(m.topK(['<s>'], 5)).toEqual([]);
      expect(m.score(['<s>'], 'hi')).toBe(0);
    });
  });

  describe('unigram scoring', () => {
    it('scores unigrams as count/N', () => {
      const m = new NgramModel();
      m.observe(['<s>', 'hi', 'there', '</s>']);
      m.observe(['<s>', 'hi', '</s>']);
      expect(m.stats.totalTokens).toBe(7);
      expect(m.score([], 'hi')).toBeCloseTo(2 / 7, 6);
      expect(m.score([], 'there')).toBeCloseTo(1 / 7, 6);
    });
  });

  describe('higher-order n-grams', () => {
    it('prefers a known trigram over lower-order predictions', () => {
      const m = new NgramModel({ order: 3 });
      for (let i = 0; i < 3; i++) m.observe(['<s>', 'the', 'cat', 'sat', '</s>']);
      m.observe(['<s>', 'the', 'cat', 'ran', '</s>']);
      const top = m.topK(['the', 'cat'], 2);
      expect(top[0]?.word).toBe('sat');
      expect(top[0]?.order).toBe(3);
      expect(top[1]?.word).toBe('ran');
    });

    it('uses only the last (order-1) tokens of context', () => {
      const m = new NgramModel({ order: 3 });
      m.observe(['<s>', 'a', 'b', 'c', '</s>']);
      expect(m.score(['x', 'y', 'a', 'b'], 'c')).toBeGreaterThan(0);
    });

    it('respects a configured maximum order', () => {
      const m = new NgramModel({ order: 2 });
      m.observe(['a', 'b', 'c']);
      const top = m.topK(['a', 'b'], 1);
      expect(top[0]?.word).toBe('c');
      expect(top[0]?.order).toBe(2);
    });
  });

  describe('stupid backoff', () => {
    it('falls back to lower orders with λ discount when higher is unseen', () => {
      const m = new NgramModel({ order: 3, lambda: 0.4 });
      m.observe(['<s>', 'the', 'cat', 'sat', '</s>']);
      expect(m.score(['big', 'fat'], 'the')).toBeGreaterThan(0);
    });

    it('backed-off hits have a lower order in the returned prediction', () => {
      const m = new NgramModel({ order: 3, lambda: 0.4 });
      m.observe(['<s>', 'the', 'cat', 'sat', '</s>']);
      const top = m.topK(['unseen', 'context'], 5);
      expect(top.length).toBeGreaterThan(0);
      expect(top.every(p => p.order < 3)).toBe(true);
    });
  });

  describe('sentence conditioning', () => {
    it('learns sentence-start preferences via <s>', () => {
      const m = new NgramModel({ order: 2 });
      m.observe(['<s>', 'hey', 'there', '</s>']);
      m.observe(['<s>', 'hey', 'you', '</s>']);
      m.observe(['<s>', 'hi', '</s>']);
      const top = m.topK(['<s>'], 3);
      expect(top[0]?.word).toBe('hey');
    });
  });

  describe('filtering', () => {
    it('omits <s> and </s> from topK by default', () => {
      const m = new NgramModel();
      m.observe(['<s>', 'hi', '</s>']);
      m.observe(['<s>', 'hi', '</s>']);
      const top = m.topK(['hi'], 5);
      expect(top.every(p => p.word !== '</s>' && p.word !== '<s>')).toBe(true);
    });
  });

  describe('incremental observation', () => {
    it('adds to existing counts without resetting vocabulary', () => {
      const m = new NgramModel();
      m.observe(['a', 'b']);
      const v1 = m.stats.vocabSize;
      m.observe(['a', 'c']);
      expect(m.stats.vocabSize).toBe(v1 + 1);
      expect(m.stats.totalTokens).toBe(4);
    });
  });

  describe('serialize / deserialize', () => {
    it('round-trips state so topK and score match', () => {
      const m = new NgramModel({ order: 4 });
      m.observe(['<s>', 'hello', 'world', 'today', '</s>']);
      m.observe(['<s>', 'hello', 'there', '</s>']);
      const snapshot = m.serialize();
      const m2 = NgramModel.deserialize(snapshot);
      expect(m2.stats).toEqual(m.stats);
      expect(m2.topK(['hello'], 3)).toEqual(m.topK(['hello'], 3));
      expect(m2.score(['<s>', 'hello'], 'world')).toBeCloseTo(
        m.score(['<s>', 'hello'], 'world'),
        10,
      );
    });
  });
});
