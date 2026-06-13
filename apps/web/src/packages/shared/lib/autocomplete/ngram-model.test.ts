import { describe, expect, it } from 'vitest';

import { NgramModel } from './ngram-model';
import { DAY_MS } from './recency';

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

    it('v2 snapshot round-trips timestamps when decay is enabled', () => {
      const m = new NgramModel({ order: 3, halfLifeMs: DAY_MS * 60 });
      m.observeAt(['hi', 'there'], 1_000_000);
      const snap = m.serialize();
      // With decay on, serialize emits a v2 snapshot containing timestamps.
      expect(snap.version).toBe(2);
      const m2 = NgramModel.deserialize(snap);
      // Re-observe just the tail at a much later time → decay should apply
      // to the earlier count the same way it did in the original.
      m.observeAt(['hi', 'there'], 1_000_000 + DAY_MS * 60);
      m2.observeAt(['hi', 'there'], 1_000_000 + DAY_MS * 60);
      expect(m2.count(['hi'], 'there')).toBeCloseTo(m.count(['hi'], 'there'), 10);
    });
  });

  describe('recency decay', () => {
    it('Infinity half-life behaves like undiscounted counts (Phase 1 behaviour)', () => {
      const m = new NgramModel({ halfLifeMs: Infinity });
      m.observeAt(['hi'], 0);
      m.observeAt(['hi'], DAY_MS * 365);
      expect(m.count([], 'hi')).toBe(2);
    });

    it('decays the existing entry before incrementing on observe', () => {
      const m = new NgramModel({ halfLifeMs: DAY_MS * 60 });
      m.observeAt(['hi'], 0);
      // Exactly one half-life later → existing 1 decays to 0.5; +1 → 1.5.
      m.observeAt(['hi'], DAY_MS * 60);
      expect(m.count([], 'hi')).toBeCloseTo(1.5, 10);
    });

    it('skips decay within the skip window (observations stay integer)', () => {
      const m = new NgramModel({ halfLifeMs: DAY_MS * 60 });
      m.observeAt(['hi'], 0);
      m.observeAt(['hi'], 30 * 60 * 1000); // 30 min later, within 1h window
      expect(m.count([], 'hi')).toBe(2);
    });

    it('decays cross-order counts consistently', () => {
      const m = new NgramModel({ halfLifeMs: DAY_MS * 60, order: 2 });
      m.observeAt(['hi', 'there'], 0);
      m.observeAt(['hi', 'there'], DAY_MS * 60);
      // Both unigram 'hi' and bigram (hi)->there halve then +1
      expect(m.count([], 'hi')).toBeCloseTo(1.5, 10);
      expect(m.count(['hi'], 'there')).toBeCloseTo(1.5, 10);
    });

    it('compact() brings every entry to the same reference time and rebuilds totals', () => {
      const m = new NgramModel({ halfLifeMs: DAY_MS * 60 });
      m.observeAt(['hi'], 0);
      m.observeAt(['bye'], 0);
      m.compact(DAY_MS * 60);
      expect(m.count([], 'hi')).toBeCloseTo(0.5, 10);
      expect(m.count([], 'bye')).toBeCloseTo(0.5, 10);
      // After compaction, scoring is internally consistent:
      //   P(hi) = 0.5 / (0.5 + 0.5) = 0.5
      expect(m.score([], 'hi')).toBeCloseTo(0.5, 10);
    });
  });

  describe('top-K pruning', () => {
    it('prunes lowest-count entries first per order', () => {
      const m = new NgramModel({ order: 1 });
      // 5 unigrams with distinct counts 1..5
      m.observe(['a']);
      m.observe(['b', 'b']);
      m.observe(['c', 'c', 'c']);
      m.observe(['d', 'd', 'd', 'd']);
      m.observe(['e', 'e', 'e', 'e', 'e']);
      m.prune({ 1: 3 });
      expect(m.count([], 'a')).toBe(0);
      expect(m.count([], 'b')).toBe(0);
      expect(m.count([], 'c')).toBe(3);
      expect(m.count([], 'd')).toBe(4);
      expect(m.count([], 'e')).toBe(5);
    });

    it('leaves orders below their cap unchanged', () => {
      const m = new NgramModel({ order: 2 });
      m.observe(['a', 'b']);
      m.observe(['c', 'd']);
      m.prune({ 1: 100, 2: 100 });
      expect(m.count([], 'a')).toBe(1);
      expect(m.count(['a'], 'b')).toBe(1);
    });
  });

  describe('count accessor', () => {
    it('returns stored n-gram count (0 if absent)', () => {
      const m = new NgramModel({ order: 3 });
      m.observe(['the', 'cat', 'sat']);
      expect(m.count([], 'the')).toBe(1);
      expect(m.count(['the'], 'cat')).toBe(1);
      expect(m.count(['the', 'cat'], 'sat')).toBe(1);
      expect(m.count(['the', 'cat'], 'ran')).toBe(0);
    });
  });
});
