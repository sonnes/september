import { describe, expect, it } from 'vitest';

import { Autocomplete } from './autocomplete';

const CORPUS =
  'the cat sat on the mat. the dog ran in the park. the cat sat on the couch. ' +
  'i will be there soon. i will be back. i love you. i love machine learning. ' +
  'machine learning is cool. machine learning is hard. machine learning is fun.';

describe('Autocomplete — back-compat simple API', () => {
  it('train/getCompletions/getNextWord still work on string inputs', () => {
    const a = new Autocomplete();
    a.train(CORPUS);
    expect(a.isReady()).toBe(true);

    const completions = a.getCompletions('mach');
    expect(completions).toContain('machine');

    const next = a.getNextWord('machine learning');
    expect(next[0]).toBe('is');
  });

  it('throws when used before training', () => {
    const a = new Autocomplete();
    expect(() => a.getCompletions('x')).toThrow(/trained/);
    expect(() => a.getNextWord('x')).toThrow(/trained/);
    expect(() => a.getStats()).toThrow(/trained/);
  });

  it('getStats reports a plausible shape', () => {
    const a = new Autocomplete();
    a.train(CORPUS);
    const s = a.getStats();
    expect(s.totalWords).toBeGreaterThan(0); // unique vocabulary size
    expect(s.totalNGrams).toBeGreaterThan(0);
    expect(s.averageWordFrequency).toBeGreaterThan(0);
  });
});

describe('Autocomplete — observe() incremental learning', () => {
  it('adds new counts without wiping prior observations', () => {
    const a = new Autocomplete();
    a.train(CORPUS);

    const before = a.getStats();
    a.observe('brand new sentence with novel vocabulary oomph.');
    const after = a.getStats();

    expect(after.totalWords).toBeGreaterThan(before.totalWords);
    expect(a.getCompletions('oom')).toContain('oomph');
  });

  it('updates next-word predictions from observed context', () => {
    const a = new Autocomplete();
    a.train('hello there. hello there.');
    // Before observation, predicting after "hello" should give "there".
    expect(a.getNextWord('hello')[0]).toBe('there');

    // Reinforce "hello friend" heavily.
    for (let i = 0; i < 10; i++) a.observe('hello friend!');
    expect(a.getNextWord('hello')[0]).toBe('friend');
  });
});

describe('Autocomplete — suggestWord (prefix + context + fuzzy)', () => {
  it('returns prefix-matching words ranked by unigram count when no context', () => {
    const a = new Autocomplete();
    a.train(CORPUS);
    const hits = a.suggestWord({ prefix: 'ma' });
    expect(hits[0]?.word).toMatch(/^(machine|mat)/);
  });

  it('boosts words that fit the preceding context', () => {
    const a = new Autocomplete();
    a.train(CORPUS);
    // After "i love", "machine" should rank above "mat" even though "mat" is
    // also a valid 'ma' completion.
    const hits = a.suggestWord({ prefix: 'ma', context: 'i love' });
    expect(hits[0]?.word).toBe('machine');
  });

  it('tolerates a QWERTY-adjacent typo when fuzzy is enabled', () => {
    const a = new Autocomplete();
    a.train(CORPUS);
    // 'mzchine' (z is QWERTY-adjacent to a). Without fuzzy: no match.
    const exact = a.suggestWord({ prefix: 'mzch', fuzzy: false });
    expect(exact.some(h => h.word === 'machine')).toBe(false);
    const fuzzy = a.suggestWord({ prefix: 'mzch', fuzzy: true });
    expect(fuzzy.some(h => h.word === 'machine')).toBe(true);
  });
});

describe('Autocomplete — persistence snapshot round-trip', () => {
  it('getSnapshot + restoreFromSnapshot preserves predictions', () => {
    const a = new Autocomplete();
    a.train(CORPUS);
    const snap = a.getSnapshot();

    const b = new Autocomplete();
    b.restoreFromSnapshot(snap);
    expect(b.isReady()).toBe(true);
    expect(b.getCompletions('mach')).toEqual(a.getCompletions('mach'));
    expect(b.getNextWord('machine learning')).toEqual(a.getNextWord('machine learning'));
  });

  it('reads a v1 (Phase 1) snapshot into the base layer', () => {
    const a = new Autocomplete();
    a.train(CORPUS);
    const snap = a.getSnapshot();
    // Simulate an old v1 snapshot on disk.
    const v1 = {
      version: 1 as const,
      createdAt: snap.createdAt,
      ngram: snap.base,
    };

    const b = new Autocomplete();
    b.restoreFromSnapshot(v1);
    expect(b.isReady()).toBe(true);
    expect(b.getNextWord('machine learning')[0]).toBe('is');
  });

  it('round-trips user + chat layers through v2 snapshots', () => {
    const a = new Autocomplete();
    a.train(CORPUS);
    for (let i = 0; i < 6; i++) a.observe('hello friend', { chatId: 'buddy-1' });
    const snap = a.getSnapshot();

    const b = new Autocomplete();
    b.restoreFromSnapshot(snap);
    expect(
      b.suggestWord({ prefix: 'fr', context: 'hello', chatId: 'buddy-1' })[0]?.word,
    ).toBe('friend');
  });
});

describe('Autocomplete — Phase 2 layered personalization', () => {
  it('observe() without chatId updates only the global user layer', () => {
    const a = new Autocomplete();
    a.train('the cat sat. the cat sat.');
    for (let i = 0; i < 5; i++) a.observe('the cat purrs');
    // The suggestion should reflect the user's personal shift.
    const next = a.getNextWord('the cat');
    expect(next[0]).toBe('purrs');
  });

  it('chat-specific observe biases predictions in that chat only', () => {
    const a = new Autocomplete();
    a.train('see you at the meeting. see you at the meeting.');
    // Chat A: user often says "see you at the pool"
    for (let i = 0; i < 20; i++) a.observe('see you at the pool', { chatId: 'A' });
    // Chat B: user often says "see you at the gym"
    for (let i = 0; i < 20; i++) a.observe('see you at the gym', { chatId: 'B' });

    const inA = a.getNextWord('see you at the', { chatId: 'A' });
    const inB = a.getNextWord('see you at the', { chatId: 'B' });
    expect(inA[0]).toBe('pool');
    expect(inB[0]).toBe('gym');
  });

  it('suggestWord({ chatId }) prefers the chat-specific completion over base', () => {
    const a = new Autocomplete();
    a.train('see you at the meeting. see you at the meeting.');
    for (let i = 0; i < 20; i++) a.observe('see you at the pool', { chatId: 'A' });
    const hit = a.suggestWord({ prefix: 'p', context: 'see you at the', chatId: 'A' });
    expect(hit[0]?.word).toBe('pool');
  });
});
