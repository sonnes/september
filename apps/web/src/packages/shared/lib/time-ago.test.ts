import { describe, expect, it } from 'vitest';

import { timeAgo } from './time-ago';

function ago(seconds: number): Date {
  return new Date(Date.now() - seconds * 1000);
}

describe('timeAgo', () => {
  it('returns "now" for very recent dates', () => {
    expect(timeAgo(ago(0))).toBe('now');
  });

  it('handles seconds', () => {
    expect(timeAgo(ago(30))).toBe('30 seconds ago');
  });

  it('handles 1 minute', () => {
    expect(timeAgo(ago(60))).toBe('1 minute ago');
  });

  it('handles minutes', () => {
    expect(timeAgo(ago(120))).toBe('2 minutes ago');
  });

  it('handles hours', () => {
    expect(timeAgo(ago(7200))).toBe('2 hours ago');
  });

  it('handles yesterday', () => {
    expect(timeAgo(ago(86400))).toBe('yesterday');
  });

  it('handles days', () => {
    expect(timeAgo(ago(86400 * 3))).toBe('3 days ago');
  });

  it('handles weeks', () => {
    expect(timeAgo(ago(86400 * 14))).toBe('2 weeks ago');
  });

  it('handles months', () => {
    expect(timeAgo(ago(86400 * 60))).toBe('2 months ago');
  });

  it('handles years', () => {
    expect(timeAgo(ago(86400 * 400))).toBe('last year');
  });

  it('accepts a string date', () => {
    const result = timeAgo(new Date(Date.now() - 3600000).toISOString());
    expect(result).toBe('1 hour ago');
  });

  it('accepts a numeric timestamp', () => {
    const result = timeAgo(Date.now() - 60000);
    expect(result).toBe('1 minute ago');
  });
});
