import { describe, expect, it } from 'vitest';

import { bucketCost, formatCompact, formatDuration, formatWhole, percentOf } from './format';

describe('formatCompact', () => {
  it('leaves small numbers alone', () => {
    expect(formatCompact(0)).toBe('0');
    expect(formatCompact(999)).toBe('999');
  });

  it('abbreviates thousands and millions', () => {
    expect(formatCompact(41200)).toBe('41.2k');
    expect(formatCompact(847100)).toBe('847.1k');
    expect(formatCompact(1_250_000)).toBe('1.3M');
  });
});

describe('formatWhole', () => {
  it('groups digits and drops fractions', () => {
    expect(formatWhole(3858)).toBe('3,858');
    expect(formatWhole(37060.4)).toBe('37,060');
  });
});

describe('formatDuration', () => {
  it('renders audio length as minutes and seconds', () => {
    expect(formatDuration(14)).toBe('0:14');
    expect(formatDuration(760)).toBe('12:40');
    expect(formatDuration(0)).toBe('0:00');
  });
});

describe('bucketCost', () => {
  it('keeps the amount when the bucket really was priced', () => {
    expect(bucketCost({ cost_usd: 0.09, source: 'estimated' })).toEqual({
      amount_usd: 0.09,
      source: 'estimated',
    });
    expect(bucketCost({ cost_usd: 0, source: 'free' })).toEqual({
      amount_usd: 0,
      source: 'free',
    });
  });

  it('drops the amount when there was no price — zero would read as free', () => {
    expect(bucketCost({ cost_usd: 0, source: 'quota' })).toEqual({ source: 'quota' });
    expect(bucketCost({ cost_usd: 0, source: 'unknown' })).toEqual({ source: 'unknown' });
  });
});

describe('percentOf', () => {
  it('is zero when there is nothing to divide', () => {
    expect(percentOf(5, 0)).toBe(0);
  });

  it('returns a percentage', () => {
    expect(percentOf(37060, 100000)).toBeCloseTo(37.06, 5);
  });
});
