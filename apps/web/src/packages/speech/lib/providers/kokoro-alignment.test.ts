import { describe, expect, it } from 'vitest';

import { estimateAlignment } from './kokoro-alignment';

describe('estimateAlignment', () => {
  it('returns an empty alignment for no chunks', () => {
    expect(estimateAlignment([])).toEqual({
      characters: [],
      start_times: [],
      end_times: [],
    });
  });

  it('distributes a chunk duration uniformly across its characters', () => {
    const alignment = estimateAlignment([{ text: 'ab', durationSeconds: 1 }]);
    expect(alignment.characters).toEqual(['a', 'b']);
    expect(alignment.start_times).toEqual([0, 0.5]);
    expect(alignment.end_times).toEqual([0.5, 1]);
  });

  it('offsets later chunks by the audio time before them', () => {
    const alignment = estimateAlignment([
      { text: 'ab', durationSeconds: 1 },
      { text: 'cd', durationSeconds: 1.5 },
    ]);
    // Later chunks are joined with a separating space that shares the chunk's time.
    expect(alignment.characters).toEqual(['a', 'b', ' ', 'c', 'd']);
    expect(alignment.start_times).toEqual([0, 0.5, 1, 1.5, 2]);
    expect(alignment.end_times).toEqual([0.5, 1, 1.5, 2, 2.5]);
  });

  it('separates chunks with a space so words do not merge across sentences', () => {
    const alignment = estimateAlignment([
      { text: 'Hi.', durationSeconds: 1 },
      { text: 'Yo.', durationSeconds: 1 },
    ]);
    expect(alignment.characters.join('')).toBe('Hi. Yo.');
    // Same-length arrays — one timing entry per character.
    expect(alignment.start_times).toHaveLength(alignment.characters.length);
    expect(alignment.end_times).toHaveLength(alignment.characters.length);
    // Times never regress.
    for (let i = 1; i < alignment.start_times.length; i++) {
      expect(alignment.start_times[i]).toBeGreaterThanOrEqual(alignment.start_times[i - 1]);
    }
  });

  it('skips empty chunks without emitting characters', () => {
    const alignment = estimateAlignment([
      { text: '', durationSeconds: 0.5 },
      { text: 'a', durationSeconds: 1 },
    ]);
    expect(alignment.characters).toEqual(['a']);
    // The silent chunk still advances the clock.
    expect(alignment.start_times).toEqual([0.5]);
    expect(alignment.end_times).toEqual([1.5]);
  });
});
