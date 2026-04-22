import { describe, expect, it } from 'vitest';

import {
  DAY_MS,
  DEFAULT_DECAY_SKIP_WINDOW_MS,
  DEFAULT_HALF_LIFE_MS,
  decayCount,
  decayFactor,
  halfLifeFromDays,
  shouldSkipDecay,
} from './recency';

describe('recency math', () => {
  describe('decayFactor', () => {
    it('returns 1 when halfLife is Infinity (decay disabled)', () => {
      expect(decayFactor(DAY_MS * 365, Infinity)).toBe(1);
    });

    it('returns 1 when halfLife is ≤ 0', () => {
      expect(decayFactor(DAY_MS, 0)).toBe(1);
      expect(decayFactor(DAY_MS, -1)).toBe(1);
    });

    it('returns 1 when age is ≤ 0', () => {
      expect(decayFactor(0, DAY_MS * 60)).toBe(1);
      expect(decayFactor(-1000, DAY_MS * 60)).toBe(1);
    });

    it('returns 0.5 at exactly one half-life', () => {
      expect(decayFactor(DAY_MS * 60, DAY_MS * 60)).toBeCloseTo(0.5, 10);
    });

    it('returns 0.25 at two half-lives', () => {
      expect(decayFactor(DAY_MS * 120, DAY_MS * 60)).toBeCloseTo(0.25, 10);
    });

    it('is monotonically non-increasing with age', () => {
      const half = DAY_MS * 30;
      let prev = 1;
      for (const age of [0, DAY_MS, DAY_MS * 10, DAY_MS * 30, DAY_MS * 90]) {
        const f = decayFactor(age, half);
        expect(f).toBeLessThanOrEqual(prev);
        prev = f;
      }
    });
  });

  describe('decayCount', () => {
    it('1 × exp(-ln2) ≈ 0.5 after one half-life', () => {
      expect(decayCount(1, DAY_MS * 60, DAY_MS * 60)).toBeCloseTo(0.5, 10);
    });

    it('scales linearly in the count', () => {
      const half = DAY_MS * 60;
      expect(decayCount(10, half, half)).toBeCloseTo(5, 10);
    });

    it('no-op when halfLife is Infinity', () => {
      expect(decayCount(7, DAY_MS * 1000, Infinity)).toBe(7);
    });
  });

  describe('shouldSkipDecay', () => {
    it('returns true for Δt below the skip window', () => {
      expect(shouldSkipDecay(0, DEFAULT_DECAY_SKIP_WINDOW_MS - 1)).toBe(true);
      expect(shouldSkipDecay(0, 0)).toBe(true);
    });

    it('returns false for Δt beyond the skip window', () => {
      expect(shouldSkipDecay(0, DEFAULT_DECAY_SKIP_WINDOW_MS + 1)).toBe(false);
    });

    it('always returns true when halfLife is Infinity', () => {
      expect(shouldSkipDecay(0, DAY_MS * 365, Infinity)).toBe(true);
    });
  });

  describe('halfLifeFromDays', () => {
    it('converts days to ms', () => {
      expect(halfLifeFromDays(1)).toBe(DAY_MS);
      expect(halfLifeFromDays(60)).toBe(DAY_MS * 60);
    });

    it('passes through Infinity', () => {
      expect(halfLifeFromDays(Infinity)).toBe(Infinity);
    });
  });

  describe('defaults', () => {
    it('has a 60-day default half-life', () => {
      expect(DEFAULT_HALF_LIFE_MS).toBe(DAY_MS * 60);
    });

    it('has a 1-hour default skip window', () => {
      expect(DEFAULT_DECAY_SKIP_WINDOW_MS).toBe(60 * 60 * 1000);
    });
  });
});
