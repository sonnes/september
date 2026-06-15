import { describe, expect, it } from 'vitest';

import type { SavedPhrase } from '../types';
import {
  PHRASES_STALE_AFTER,
  buildPhrasesPrompt,
  decidePhraseSync,
  dedupeAgainstPinned,
  isStale,
  topPhrases,
} from './phrases';

function phrase(text: string, pinned: boolean): SavedPhrase {
  return { id: text, space_id: 's', user_id: 'u', text, pinned, created_at: new Date(0) };
}

describe('dedupeAgainstPinned', () => {
  it('drops AI texts that case-insensitively match a pinned text', () => {
    const out = dedupeAgainstPinned(['Call the nurse'], ['call the NURSE', 'I am tired']);
    expect(out).toEqual(['I am tired']);
  });

  it('drops duplicates within the AI set, preserving first occurrence and order', () => {
    const out = dedupeAgainstPinned([], ['Hello', 'world', 'HELLO']);
    expect(out).toEqual(['Hello', 'world']);
  });

  it('ignores blank/whitespace AI texts', () => {
    const out = dedupeAgainstPinned([], ['  ', 'Yes please']);
    expect(out).toEqual(['Yes please']);
  });
});

describe('topPhrases', () => {
  it('orders pinned first, then AI, capped at n', () => {
    const rows = [
      phrase('ai-1', false),
      phrase('pin-1', true),
      phrase('ai-2', false),
      phrase('pin-2', true),
    ];
    expect(topPhrases(rows, 3)).toEqual(['pin-1', 'pin-2', 'ai-1']);
  });

  it('returns all when fewer than n', () => {
    expect(topPhrases([phrase('a', true)], 5)).toEqual(['a']);
  });
});

describe('isStale', () => {
  it('is stale when never seeded and there is at least one message', () => {
    expect(isStale(undefined, 1, PHRASES_STALE_AFTER)).toBe(true);
    expect(isStale(undefined, 0, PHRASES_STALE_AFTER)).toBe(false);
  });

  it('is stale only once enough new messages accumulate', () => {
    expect(isStale(4, 4 + PHRASES_STALE_AFTER - 1, PHRASES_STALE_AFTER)).toBe(false);
    expect(isStale(4, 4 + PHRASES_STALE_AFTER, PHRASES_STALE_AFTER)).toBe(true);
  });
});

describe('decidePhraseSync', () => {
  it('seeds when never generated and a message exists', () => {
    expect(decidePhraseSync({ syncedCount: undefined, messageCount: 1 })).toBe('seed');
    expect(decidePhraseSync({ syncedCount: undefined, messageCount: 0 })).toBe('none');
  });

  it('regenerates when seeded and stale, otherwise none', () => {
    expect(decidePhraseSync({ syncedCount: 2, messageCount: 2 + PHRASES_STALE_AFTER })).toBe('regen');
    expect(decidePhraseSync({ syncedCount: 2, messageCount: 3 })).toBe('none');
  });
});

describe('buildPhrasesPrompt', () => {
  it('includes the full existing collection so the AI sees the whole picture', () => {
    const { prompt } = buildPhrasesPrompt({
      existing: ['I need water', 'Call the nurse'],
      history: ['Hello there'],
      context: 'Talking to my carer.',
    });
    expect(prompt).toContain('I need water');
    expect(prompt).toContain('Call the nurse');
    expect(prompt).toContain('Hello there');
    expect(prompt).toContain('Talking to my carer.');
  });

  it('always returns a non-empty system prompt', () => {
    const { system } = buildPhrasesPrompt({ existing: [], history: [] });
    expect(system.length).toBeGreaterThan(0);
  });
});
