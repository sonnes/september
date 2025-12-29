'use client';

import { useCallback, useMemo } from 'react';

import { Alignment, CharacterAlignment, toCharacterAlignment } from '@/packages/audio/types';

type ComposeSegmentsOptions = {
  hideAudioTags?: boolean;
};

type BaseSegment = {
  segmentIndex: number;
  text: string;
};

export type TextWord = BaseSegment & {
  kind: 'word';
  wordIndex: number;
  startTime: number;
  endTime: number;
};

export type GapSegment = BaseSegment & {
  kind: 'gap';
};

export type TextSegment = TextWord | GapSegment;

type ComposeSegmentsResult = {
  segments: TextSegment[];
  words: TextWord[];
};

function composeSegments(
  alignment: CharacterAlignment,
  options: ComposeSegmentsOptions = {}
): ComposeSegmentsResult {
  const {
    characters,
    characterStartTimesSeconds: starts,
    characterEndTimesSeconds: ends,
  } = alignment;

  const segments: TextSegment[] = [];
  const words: TextWord[] = [];

  let wordBuffer = '';
  let whitespaceBuffer = '';
  let wordStart = 0;
  let wordEnd = 0;
  let segmentIndex = 0;
  let wordIndex = 0;
  let insideAudioTag = false;

  const hideAudioTags = options.hideAudioTags ?? false;

  const flushWhitespace = () => {
    if (!whitespaceBuffer) return;
    segments.push({
      kind: 'gap',
      segmentIndex: segmentIndex++,
      text: whitespaceBuffer,
    });
    whitespaceBuffer = '';
  };

  const flushWord = () => {
    if (!wordBuffer) return;
    const word: TextWord = {
      kind: 'word',
      segmentIndex: segmentIndex++,
      wordIndex: wordIndex++,
      text: wordBuffer,
      startTime: wordStart,
      endTime: wordEnd,
    };
    segments.push(word);
    words.push(word);
    wordBuffer = '';
  };

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const start = starts[i] ?? 0;
    const end = ends[i] ?? start;

    if (hideAudioTags) {
      if (char === '[') {
        flushWord();
        whitespaceBuffer = '';
        insideAudioTag = true;
        continue;
      }

      if (insideAudioTag) {
        if (char === ']') insideAudioTag = false;
        continue;
      }
    }

    if (/\s/.test(char)) {
      flushWord();
      whitespaceBuffer += char;
      continue;
    }

    if (whitespaceBuffer) {
      flushWhitespace();
    }

    if (!wordBuffer) {
      wordBuffer = char;
      wordStart = start;
      wordEnd = end;
    } else {
      wordBuffer += char;
      wordEnd = end;
    }
  }

  flushWord();
  flushWhitespace();

  return { segments, words };
}

export type WordStatus = 'spoken' | 'unspoken' | 'current';

export interface UseTextViewerProps {
  /** Character-level alignment data (internal format) */
  alignment: Alignment;
  /** Current playback time in seconds from audio player */
  currentTime: number;
  /** Total duration in seconds (optional, used for nearEnd detection) */
  duration?: number;
  /** Whether to hide [audio tags] from text */
  hideAudioTags?: boolean;
}

export interface UseTextViewerResult {
  segments: TextSegment[];
  words: TextWord[];
  spokenSegments: TextSegment[];
  unspokenSegments: TextSegment[];
  currentWord: TextWord | null;
  currentSegmentIndex: number;
  currentWordIndex: number;
  seekToWord: (word: number | TextWord) => number;
}

export function useTextViewer({
  alignment,
  currentTime,
  duration = 0,
  hideAudioTags = true,
}: UseTextViewerProps): UseTextViewerResult {
  // Convert to ElevenLabs-compatible format
  const characterAlignment = useMemo(() => toCharacterAlignment(alignment), [alignment]);

  const { segments, words } = useMemo(
    () => composeSegments(characterAlignment, { hideAudioTags }),
    [characterAlignment, hideAudioTags]
  );

  // Binary search for word at time
  const findWordIndex = useCallback(
    (time: number) => {
      if (!words.length) return -1;
      let lo = 0;
      let hi = words.length - 1;
      let answer = -1;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const word = words[mid];
        if (time >= word.startTime && time < word.endTime) {
          answer = mid;
          break;
        }
        if (time < word.startTime) {
          hi = mid - 1;
        } else {
          lo = mid + 1;
        }
      }
      return answer;
    },
    [words]
  );

  const currentWordIndex = useMemo(() => {
    return findWordIndex(currentTime);
  }, [currentTime, findWordIndex]);

  // Returns the start time for seeking
  const seekToWord = useCallback(
    (word: number | TextWord): number => {
      const target = typeof word === 'number' ? words[word] : word;
      return target?.startTime ?? 0;
    },
    [words]
  );

  const currentWord =
    currentWordIndex >= 0 && currentWordIndex < words.length ? words[currentWordIndex] : null;
  const currentSegmentIndex = currentWord?.segmentIndex ?? -1;

  // Check if near end (all words spoken)
  const nearEnd = useMemo(() => {
    if (!duration) return false;
    return currentTime >= duration - 0.01;
  }, [currentTime, duration]);

  const spokenSegments = useMemo(() => {
    if (nearEnd) return segments;
    if (!segments.length || currentSegmentIndex <= 0) return [];
    return segments.slice(0, currentSegmentIndex);
  }, [segments, currentSegmentIndex, nearEnd]);

  const unspokenSegments = useMemo(() => {
    if (nearEnd) return [];
    if (!segments.length) return [];
    if (currentSegmentIndex === -1) return segments;
    if (currentSegmentIndex + 1 >= segments.length) return [];
    return segments.slice(currentSegmentIndex + 1);
  }, [segments, currentSegmentIndex, nearEnd]);

  const resolvedCurrentWord = nearEnd ? null : currentWord;

  // Memoize the return value to prevent unnecessary context re-renders
  // Only creates a new object when actual values change
  return useMemo(
    () => ({
      segments,
      words,
      spokenSegments,
      unspokenSegments,
      currentWord: resolvedCurrentWord,
      currentSegmentIndex,
      currentWordIndex,
      seekToWord,
    }),
    [
      segments,
      words,
      spokenSegments,
      unspokenSegments,
      resolvedCurrentWord,
      currentSegmentIndex,
      currentWordIndex,
      seekToWord,
    ]
  );
}
