import { describe, expect, it } from 'vitest';

import type { SavedPhrase } from '../types';
import {
  PHRASES_STALE_AFTER,
  buildPhrasesPrompt,
  decidePhraseSync,
  dedupeAgainstPinned,
  formatPhraseHistory,
  rowKind,
  sanitizeStarters,
  topPhrases,
  topRows,
} from './phrases';

function phrase(text: string, pinned: boolean, kind?: 'phrase' | 'starter'): SavedPhrase {
  return { id: text, space_id: 's', user_id: 'u', text, pinned, kind, created_at: new Date(0) };
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

  it('excludes starters', () => {
    const rows = [phrase('starter-1', true, 'starter'), phrase('phrase-1', true)];
    expect(topPhrases(rows, 5)).toEqual(['phrase-1']);
  });
});

describe('rowKind', () => {
  it('treats a missing kind as phrase (rows persisted before the field existed)', () => {
    expect(rowKind(phrase('a', true))).toBe('phrase');
    expect(rowKind(phrase('a', true, 'starter'))).toBe('starter');
  });
});

describe('topRows', () => {
  it('filters by kind, pinned first, capped at n', () => {
    const rows = [
      phrase('ai-starter', false, 'starter'),
      phrase('ai-phrase', false),
      phrase('pin-starter', true, 'starter'),
      phrase('pin-phrase', true, 'phrase'),
    ];
    expect(topRows(rows, 2, 'starter').map(r => r.text)).toEqual(['pin-starter', 'ai-starter']);
    expect(topRows(rows, 1, 'phrase').map(r => r.text)).toEqual(['pin-phrase']);
  });
});

describe('sanitizeStarters', () => {
  it('trims, drops blanks, and drops out-of-range word counts', () => {
    expect(
      sanitizeStarters([
        '  Can you please check  ',
        '',
        '   ',
        'Hi', // 1 word — too short to be a starter
        'this one has far too many words to be a starter prefix',
      ])
    ).toEqual(['Can you please check']);
  });

  it('keeps 2–6 word prefixes', () => {
    expect(sanitizeStarters(['I would like', 'Could we maybe schedule something for'])).toEqual([
      'I would like',
      'Could we maybe schedule something for',
    ]);
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

describe('formatPhraseHistory', () => {
  it('labels user messages "Me" and transcriptions "Them"', () => {
    expect(
      formatPhraseHistory([
        { type: 'user', text: 'Hello' },
        { type: 'transcription', text: 'Hi there' },
      ])
    ).toEqual(['Me: Hello', 'Them: Hi there']);
  });
});

describe('buildPhrasesPrompt', () => {
  it('includes the full existing collection so the AI sees the whole picture', () => {
    const { prompt } = buildPhrasesPrompt({
      existing: [
        { text: 'I need water', pinned: false },
        { text: 'Call the nurse', pinned: true },
      ],
      history: ['Me: Hello there'],
      context: 'Talking to my carer.',
    });
    expect(prompt).toContain('- I need water');
    expect(prompt).toContain('- [pinned] Call the nurse');
    expect(prompt).toContain('Me: Hello there');
    expect(prompt).toContain('Talking to my carer.');
  });

  it('marks pinned starters and asks for both sets', () => {
    const { system, prompt } = buildPhrasesPrompt({
      existing: [{ text: 'I need water', pinned: false }],
      existingStarters: [{ text: 'Can you please', pinned: true }],
      history: [],
    });
    expect(prompt).toContain('- [pinned] Can you please');
    expect(system).toContain('starters');
  });

  it('explains pinned handling in the system prompt', () => {
    const { system } = buildPhrasesPrompt({ existing: [], history: [] });
    expect(system).toContain('[pinned]');
  });

  it('presents history as conversation lines, not as the User speaking', () => {
    const { prompt } = buildPhrasesPrompt({
      existing: [],
      history: ['Them: How are you?'],
    });
    expect(prompt).toContain('Recent conversation');
    expect(prompt).not.toContain('Recent things the User has said');
  });

  it('always returns a non-empty system prompt', () => {
    const { system } = buildPhrasesPrompt({ existing: [], history: [] });
    expect(system.length).toBeGreaterThan(0);
  });
});
