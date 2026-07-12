import type { Alignment } from '@/packages/audio';

export interface KokoroAlignmentChunk {
  /** Text the chunk voices (one sentence from the splitter). */
  text: string;
  /** Duration of the chunk's audio in seconds. */
  durationSeconds: number;
}

/**
 * Estimate a character-level alignment from per-chunk text and audio duration.
 * Kokoro does not return timing, so each chunk's duration is spread uniformly
 * across its characters — coarse, but enough for reel captions and karaoke
 * highlighting, which group characters into words. Chunks are joined with a
 * space so words never merge across sentence boundaries.
 */
export function estimateAlignment(chunks: KokoroAlignmentChunk[]): Alignment {
  const characters: string[] = [];
  const start_times: number[] = [];
  const end_times: number[] = [];

  let clock = 0;
  let first = true;
  for (const chunk of chunks) {
    const text = chunk.text;
    if (text.length === 0) {
      clock += chunk.durationSeconds;
      continue;
    }
    const chars = first ? text : ` ${text}`;
    first = false;
    const perChar = chunk.durationSeconds / chars.length;
    for (let i = 0; i < chars.length; i++) {
      characters.push(chars[i]);
      start_times.push(clock + i * perChar);
      end_times.push(clock + (i + 1) * perChar);
    }
    clock += chunk.durationSeconds;
  }

  return { characters, start_times, end_times };
}
