import { describe, expect, it } from 'vitest';

import { tokenize, type Token } from './tokenizer.ts';

const pairs = (tokens: Token[]) => tokens.map((t) => [t.normalized, t.kind]);

describe('tokenize', () => {
  it('gives no tokens for empty or blank text', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   \n\t ')).toEqual([]);
  });

  it('wraps each sentence in start and end marks', () => {
    expect(pairs(tokenize('Hi. Bye'))).toEqual([
      ['<s>', 'sentence-start'],
      ['hi', 'word'],
      ['.', 'punct'],
      ['</s>', 'sentence-end'],
      ['<s>', 'sentence-start'],
      ['bye', 'word'],
      ['</s>', 'sentence-end'],
    ]);
  });

  it('does not end a sentence at a comma', () => {
    expect(pairs(tokenize('yes, ok'))).toEqual([
      ['<s>', 'sentence-start'],
      ['yes', 'word'],
      [',', 'punct'],
      ['ok', 'word'],
      ['</s>', 'sentence-end'],
    ]);
  });

  it('lowercases words and keeps a contraction whole', () => {
    const words = tokenize("Don't STOP").filter((t) => t.kind === 'word');
    expect(words.map((t) => t.normalized)).toEqual(["don't", 'stop']);
  });

  it('keeps an emoji, even one of several code points, as one token', () => {
    const emoji = tokenize('family 👨‍👩‍👧 love').filter((t) => t.kind === 'emoji');
    expect(emoji.map((t) => t.normalized)).toEqual(['👨‍👩‍👧']);
  });

  it('keeps an audio tag as one token between the words', () => {
    expect(
      pairs(tokenize('so funny [Clears throat] yes')).filter(
        ([, kind]) => kind !== 'sentence-start' && kind !== 'sentence-end',
      ),
    ).toEqual([
      ['so', 'word'],
      ['funny', 'word'],
      ['[clears throat]', 'tag'],
      ['yes', 'word'],
    ]);
  });
});
