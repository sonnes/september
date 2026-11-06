/** The captions of a video, from the timing that the voice returns. */

import type { ChunkRole } from "./stage.ts";

/** What a speech service returns beside the sound, character by character. */
export interface SpeechAlignment {
  characters: string[];
  start_times: number[];
  end_times: number[];
}

export interface TimedWord {
  text: string;
  startTime: number;
  endTime: number;
}

/** A line of a video caption, and when each of its words is said. */
export interface Caption {
  startTime: number;
  endTime: number;
  words: TimedWord[];
}

const CAPTION_MAX_WORDS = 6;
const CAPTION_MAX_SECONDS = 2.4;
const CAPTION_PAUSE_SECONDS = 0.35;

/**
 * The words of the sound, from the character alignment.
 *
 * An audio tag such as `[laughs]` is an instruction to the voice, not a word,
 * so it never reaches a caption.
 */
export function alignmentToWords(alignment: SpeechAlignment): TimedWord[] {
  const words: TimedWord[] = [];
  let buffer = "";
  let startTime = 0;
  let endTime = 0;
  let insideTag = false;

  const flush = () => {
    if (!buffer) return;
    words.push({ text: buffer, startTime, endTime });
    buffer = "";
  };

  for (let i = 0; i < alignment.characters.length; i++) {
    const character = alignment.characters[i] ?? "";
    const start = alignment.start_times[i] ?? 0;
    const end = alignment.end_times[i] ?? start;

    if (character === "[") {
      flush();
      insideTag = true;
      continue;
    }
    if (insideTag) {
      if (character === "]") insideTag = false;
      continue;
    }
    if (/\s/.test(character)) {
      flush();
      continue;
    }

    if (!buffer) startTime = start;
    buffer += character;
    endTime = end;
  }

  flush();
  return words;
}

const ENDS_SENTENCE = /[.!?]$/;
const ENDS_CLAUSE = /[.!?,;:]$/;

/**
 * The captions of a video: a few words at a time, cut at a pause.
 *
 * A caption that changes every six words reads on a phone held at arm's
 * length.
 */
export function wordsToCaptions(
  words: TimedWord[],
): Caption[] {
  const captions: Caption[] = [];
  let current: TimedWord[] = [];

  const flush = () => {
    if (!current.length) return;
    captions.push({
      startTime: current[0]!.startTime,
      endTime: current[current.length - 1]!.endTime,
      words: current,
    });
    current = [];
  };

  for (const word of words) {
    const previous = current[current.length - 1];
    const pause = previous ? word.startTime - previous.endTime : 0;
    const duration = current.length ? word.endTime - current[0]!.startTime : 0;

    if (
      current.length > 0 &&
      (current.length >= CAPTION_MAX_WORDS ||
        pause > CAPTION_PAUSE_SECONDS ||
        duration > CAPTION_MAX_SECONDS)
    ) {
      flush();
    }

    current.push(word);
    if (ENDS_CLAUSE.test(word.text)) flush();
  }

  flush();
  return captions;
}

/**
 * The role of each caption, from the punctuation before it.
 *
 * A caption opens a sentence in the display size and continues it in the
 * support size, so the DOM stage and the canvas frame draw the same sequence.
 */
export function captionRoles(captions: Caption[]): ChunkRole[] {
  return captions.map((_, index) => {
    if (index === 0) return "display";
    const previous = captions[index - 1]!;
    const last = previous.words[previous.words.length - 1]?.text ?? "";
    return ENDS_SENTENCE.test(last) ? "display" : "support";
  });
}
