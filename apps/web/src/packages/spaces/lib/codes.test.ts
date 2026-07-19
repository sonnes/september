import { describe, expect, it } from 'vitest';

import type { SavedPhrase } from '../types';
import {
  generateCode,
  isCommonWord,
  matchCode,
  normalizeCode,
  trailingWord,
  validateCode,
} from './codes';

function row(overrides: Partial<SavedPhrase> & { id: string }): SavedPhrase {
  return {
    space_id: 'space-1',
    user_id: 'u',
    text: 'Thank you',
    pinned: true,
    created_at: new Date(0),
    ...overrides,
  } as SavedPhrase;
}

describe('normalizeCode', () => {
  it('trims and lowercases', () => {
    expect(normalizeCode('  Ty ')).toBe('ty');
  });
});

describe('isCommonWord', () => {
  it('knows common short words', () => {
    expect(isCommonWord('its')).toBe(true);
    expect(isCommonWord('the')).toBe(true);
    expect(isCommonWord('hi')).toBe(true);
  });

  it('does not flag non-words', () => {
    expect(isCommonWord('iwb')).toBe(false);
    expect(isCommonWord('hru')).toBe(false);
  });
});

describe('validateCode', () => {
  const opts = { existingCodes: ['nrs'], isWord: isCommonWord };

  it('accepts a valid code, normalized', () => {
    expect(validateCode(' Ty ', opts)).toEqual({ ok: true, code: 'ty' });
  });

  it('rejects bad format (too short, too long, non-alphanumeric)', () => {
    expect(validateCode('t', opts)).toMatchObject({ ok: false, reason: 'format' });
    expect(validateCode('toolong', opts)).toMatchObject({ ok: false, reason: 'format' });
    expect(validateCode('t y', opts)).toMatchObject({ ok: false, reason: 'format' });
    expect(validateCode('', opts)).toMatchObject({ ok: false, reason: 'format' });
  });

  it('rejects dictionary words with a suggestion', () => {
    const result = validateCode('its', opts);
    expect(result).toMatchObject({ ok: false, reason: 'dictionary' });
    if (!result.ok) {
      expect(result.suggestion).toBeTruthy();
      expect(isCommonWord(result.suggestion!)).toBe(false);
    }
  });

  it('rejects duplicates', () => {
    expect(validateCode('nrs', opts)).toMatchObject({ ok: false, reason: 'duplicate' });
  });
});

describe('generateCode', () => {
  const opts = { existingCodes: [] as string[], isWord: isCommonWord };

  it('uses content-word initials', () => {
    expect(generateCode('Thank you', opts)).toBe('ty');
    expect(generateCode('Please call the nurse', opts)).toBe('pcn');
  });

  it('drops stopwords but keeps "I" and "you"', () => {
    expect(generateCode('I want to go to the bathroom', opts)).toBe('iwgb');
  });

  it('caps at 4 initials', () => {
    expect(generateCode('please can you turn the volume down a little', opts)).toBe('pcyt');
  });

  it('returns undefined for single-word phrases', () => {
    expect(generateCode('Hello', opts)).toBeUndefined();
  });

  it('mutates on collision with an existing code', () => {
    const code = generateCode('Thank you', { ...opts, existingCodes: ['ty'] });
    expect(code).toBeTruthy();
    expect(code).not.toBe('ty');
    expect(code!.length).toBeLessThanOrEqual(5);
  });

  it('mutates when initials form a dictionary word', () => {
    const code = generateCode('how i see', opts); // h-i-s → "his" is common
    expect(code).toBeTruthy();
    expect(isCommonWord(code!)).toBe(false);
  });

  it('never returns a duplicate within a growing collision set', () => {
    const existing: string[] = [];
    const a = generateCode('Thank you', { ...opts, existingCodes: existing });
    existing.push(a!);
    const b = generateCode('Thank you', { ...opts, existingCodes: existing });
    expect(b).toBeTruthy();
    expect(b).not.toBe(a);
  });
});

describe('trailingWord', () => {
  it('returns the word at the caret', () => {
    expect(trailingWord('I made it, ty')).toBe('ty');
    expect(trailingWord('ty')).toBe('ty');
  });

  it('returns empty for trailing whitespace or empty text', () => {
    expect(trailingWord('ty ')).toBe('');
    expect(trailingWord('')).toBe('');
  });

  it('strips nothing — punctuation-attached words do not match codes', () => {
    expect(trailingWord('well, ty!')).toBe('ty!');
  });
});

describe('matchCode', () => {
  const rows = [
    row({ id: 'a', code: 'ty', text: 'Thank you', space_id: 'space-1' }),
    row({ id: 'b', code: 'ty', text: 'Thanks so much', space_id: 'space-2' }),
    row({ id: 'c', code: 'iwb', text: 'I want to go to the bathroom', space_id: 'space-2' }),
    row({ id: 'd', text: 'No code here', space_id: 'space-1' }),
  ];

  it('matches exactly, case-insensitively', () => {
    expect(matchCode('TY', rows, 'space-1')?.id).toBe('a');
    expect(matchCode('iwb', rows, 'space-1')?.id).toBe('c');
  });

  it('prefers the current space on conflicts', () => {
    expect(matchCode('ty', rows, 'space-1')?.id).toBe('a');
    expect(matchCode('ty', rows, 'space-2')?.id).toBe('b');
  });

  it('matches cross-space when the current space has no such code', () => {
    expect(matchCode('iwb', rows, 'space-1')?.id).toBe('c');
  });

  it('returns undefined for no match, partial match, or empty word', () => {
    expect(matchCode('t', rows, 'space-1')).toBeUndefined();
    expect(matchCode('tyx', rows, 'space-1')).toBeUndefined();
    expect(matchCode('', rows, 'space-1')).toBeUndefined();
  });
});
