import { describe, expect, it } from 'vitest';

import type { Alignment } from '@/packages/audio';

import {
  activeCaptionIndex,
  alignmentToReelWords,
  captionProgress,
  markdownToVoiceText,
  wordsToReelCaptions,
  type ReelCaption,
} from './reel';

const alignment: Alignment = {
  characters: Array.from('Hello, calm world.'),
  start_times: [
    0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 1.4, 1.45, 1.5, 1.55,
    1.6, 1.65,
  ],
  end_times: [
    0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 1.45, 1.5, 1.55, 1.6,
    1.65, 1.7,
  ],
};

describe('markdownToVoiceText', () => {
  it('turns note markdown into spoken text', () => {
    expect(
      markdownToVoiceText(`
# Sunday note

Good **morning**, [friend](https://example.test).

> Move slowly.

- Call Maya
`)
    ).toBe('Sunday note Good morning, friend. Move slowly. Call Maya');
  });

  it('removes code fences and normalizes whitespace', () => {
    expect(markdownToVoiceText('Use `yes` now\\n\\n```ts\\nconst x = 1\\n```')).toBe(
      'Use yes now const x = 1'
    );
  });
});

describe('alignmentToReelWords', () => {
  it('creates timed words from character alignment', () => {
    expect(alignmentToReelWords(alignment)).toEqual([
      { text: 'Hello,', startTime: 0, endTime: 0.3 },
      { text: 'calm', startTime: 0.6, endTime: 0.8 },
      { text: 'world.', startTime: 1.4, endTime: 1.7 },
    ]);
  });

  it('hides bracketed audio tags', () => {
    const words = alignmentToReelWords({
      characters: Array.from('Say [laughs] hi'),
      start_times: Array.from({ length: 15 }, (_, index) => index * 0.1),
      end_times: Array.from({ length: 15 }, (_, index) => index * 0.1 + 0.08),
    });

    expect(words.map(word => word.text)).toEqual(['Say', 'hi']);
  });
});

describe('wordsToReelCaptions', () => {
  it('splits captions on punctuation and pauses', () => {
    expect(
      wordsToReelCaptions(alignmentToReelWords(alignment), {
        maxWords: 5,
        maxDurationSeconds: 4,
        pauseSeconds: 0.4,
      })
    ).toEqual([
      {
        startTime: 0,
        endTime: 0.3,
        words: [{ text: 'Hello,', startTime: 0, endTime: 0.3 }],
      },
      {
        startTime: 0.6,
        endTime: 0.8,
        words: [{ text: 'calm', startTime: 0.6, endTime: 0.8 }],
      },
      {
        startTime: 1.4,
        endTime: 1.7,
        words: [{ text: 'world.', startTime: 1.4, endTime: 1.7 }],
      },
    ]);
  });

  it('limits caption word count', () => {
    const words = 'one two three four five six'.split(' ').map((text, index) => ({
      text,
      startTime: index,
      endTime: index + 0.5,
    }));

    expect(
      wordsToReelCaptions(words, { maxWords: 3, maxDurationSeconds: 10, pauseSeconds: 2 }).map(
        caption => caption.words.length
      )
    ).toEqual([3, 3]);
  });
});

const storyCaptions: ReelCaption[] = [
  { startTime: 0, endTime: 1, words: [{ text: 'one', startTime: 0, endTime: 1 }] },
  { startTime: 2, endTime: 3, words: [{ text: 'two', startTime: 2, endTime: 3 }] },
];

describe('activeCaptionIndex', () => {
  it('clamps to the first caption before playback starts', () => {
    expect(activeCaptionIndex(storyCaptions, -1)).toBe(0);
  });

  it('returns the last caption that has started', () => {
    expect(activeCaptionIndex(storyCaptions, 0)).toBe(0);
    expect(activeCaptionIndex(storyCaptions, 1.5)).toBe(0);
    expect(activeCaptionIndex(storyCaptions, 2)).toBe(1);
  });

  it('stays on the last caption after the end', () => {
    expect(activeCaptionIndex(storyCaptions, 99)).toBe(1);
  });

  it('returns -1 with no captions', () => {
    expect(activeCaptionIndex([], 0)).toBe(-1);
  });
});

describe('captionProgress', () => {
  const caption: ReelCaption = {
    startTime: 2,
    endTime: 4,
    words: [{ text: 'hi', startTime: 2, endTime: 4 }],
  };

  it('is 0 at the start and 1 at the end', () => {
    expect(captionProgress(caption, 2)).toBe(0);
    expect(captionProgress(caption, 4)).toBe(1);
  });

  it('is the fraction through the caption', () => {
    expect(captionProgress(caption, 3)).toBeCloseTo(0.5);
  });

  it('clamps outside the caption window', () => {
    expect(captionProgress(caption, 0)).toBe(0);
    expect(captionProgress(caption, 10)).toBe(1);
  });
});
