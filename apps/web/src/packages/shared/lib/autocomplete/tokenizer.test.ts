import { describe, expect, it } from 'vitest';

import { tokenize, type Token } from './tokenizer';

const asTextKind = (tokens: Token[]) =>
  tokens.map(t => ({ text: t.text, kind: t.kind }));

describe('tokenizer', () => {
  describe('empty / trivial inputs', () => {
    it('returns [] for empty string', () => {
      expect(tokenize('')).toEqual([]);
    });

    it('returns [] for whitespace-only input', () => {
      expect(tokenize('   \n\t ')).toEqual([]);
    });
  });

  describe('sentence boundary markers', () => {
    it('wraps a single sentence in <s>/</s>', () => {
      expect(asTextKind(tokenize('hello world'))).toEqual([
        { text: '<s>', kind: 'sentence-start' },
        { text: 'hello', kind: 'word' },
        { text: 'world', kind: 'word' },
        { text: '</s>', kind: 'sentence-end' },
      ]);
    });

    it('splits on terminal punctuation . ! ?', () => {
      expect(asTextKind(tokenize('Hi. Bye! Go?'))).toEqual([
        { text: '<s>', kind: 'sentence-start' },
        { text: 'Hi', kind: 'word' },
        { text: '.', kind: 'punct' },
        { text: '</s>', kind: 'sentence-end' },
        { text: '<s>', kind: 'sentence-start' },
        { text: 'Bye', kind: 'word' },
        { text: '!', kind: 'punct' },
        { text: '</s>', kind: 'sentence-end' },
        { text: '<s>', kind: 'sentence-start' },
        { text: 'Go', kind: 'word' },
        { text: '?', kind: 'punct' },
        { text: '</s>', kind: 'sentence-end' },
      ]);
    });

    it('closes a final open sentence even without terminal punctuation', () => {
      const tokens = tokenize('hello');
      expect(tokens.at(-1)?.kind).toBe('sentence-end');
    });

    it('does not emit an empty trailing sentence after final punctuation', () => {
      const tokens = tokenize('hi. ');
      expect(tokens.filter(t => t.kind === 'sentence-start')).toHaveLength(1);
      expect(tokens.filter(t => t.kind === 'sentence-end')).toHaveLength(1);
    });

    it('keeps commas as non-breaking punctuation', () => {
      expect(asTextKind(tokenize('yes, ok'))).toEqual([
        { text: '<s>', kind: 'sentence-start' },
        { text: 'yes', kind: 'word' },
        { text: ',', kind: 'punct' },
        { text: 'ok', kind: 'word' },
        { text: '</s>', kind: 'sentence-end' },
      ]);
    });
  });

  describe('casing', () => {
    it('preserves display casing in .text and lowercases .normalized', () => {
      const words = tokenize('Hello WORLD').filter(t => t.kind === 'word');
      expect(words).toEqual([
        expect.objectContaining({ text: 'Hello', normalized: 'hello' }),
        expect.objectContaining({ text: 'WORLD', normalized: 'world' }),
      ]);
    });
  });

  describe('contractions and apostrophes', () => {
    it("keeps English contractions like don't as a single word", () => {
      const words = tokenize("don't stop").filter(t => t.kind === 'word');
      expect(words.map(w => w.text)).toEqual(["don't", 'stop']);
    });
  });

  describe('emoji', () => {
    it('emits emoji as their own token with kind emoji', () => {
      const tokens = tokenize('hi 👋 friend');
      const emoji = tokens.find(t => t.kind === 'emoji');
      expect(emoji?.text).toBe('👋');
    });

    it('keeps multi-codepoint emoji as a single token', () => {
      const tokens = tokenize('family 👨‍👩‍👧 love');
      const emoji = tokens.find(t => t.kind === 'emoji');
      expect(emoji?.text).toBe('👨‍👩‍👧');
    });
  });

  describe('offsets', () => {
    it('tracks [start, end) offsets in the original string for word tokens', () => {
      const tokens = tokenize('hi world');
      const hi = tokens.find(t => t.text === 'hi')!;
      const world = tokens.find(t => t.text === 'world')!;
      expect([hi.start, hi.end]).toEqual([0, 2]);
      expect([world.start, world.end]).toEqual([3, 8]);
    });
  });
});
