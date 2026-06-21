import type { Alignment } from '@/packages/audio';

export interface ReelWord {
  text: string;
  startTime: number;
  endTime: number;
}

export interface ReelCaption {
  startTime: number;
  endTime: number;
  words: ReelWord[];
}

export interface WordsToReelCaptionsOptions {
  maxWords?: number;
  maxDurationSeconds?: number;
  pauseSeconds?: number;
}

function stripMarkdownFence(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, match =>
    match
      .replace(/^```[^\n]*\n?/, '')
      .replace(/```$/, '')
      .trim()
  );
}

export function markdownToVoiceText(markdown: string): string {
  return stripMarkdownFence(markdown.replace(/\\n/g, '\n'))
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isWordBoundary(char: string): boolean {
  return /\s/.test(char);
}

export function alignmentToReelWords(alignment: Alignment): ReelWord[] {
  const words: ReelWord[] = [];
  let buffer = '';
  let startTime = 0;
  let endTime = 0;
  let insideAudioTag = false;

  const flush = () => {
    if (!buffer) return;
    words.push({ text: buffer, startTime, endTime });
    buffer = '';
  };

  for (let i = 0; i < alignment.characters.length; i++) {
    const char = alignment.characters[i] ?? '';
    const start = alignment.start_times[i] ?? 0;
    const end = alignment.end_times[i] ?? start;

    if (char === '[') {
      flush();
      insideAudioTag = true;
      continue;
    }

    if (insideAudioTag) {
      if (char === ']') insideAudioTag = false;
      continue;
    }

    if (isWordBoundary(char)) {
      flush();
      continue;
    }

    if (!buffer) {
      startTime = start;
    }
    buffer += char;
    endTime = end;
  }

  flush();

  return words;
}

function isSentenceEnd(word: ReelWord): boolean {
  return /[.!?,;:]$/.test(word.text);
}

export function wordsToReelCaptions(
  words: ReelWord[],
  options: WordsToReelCaptionsOptions = {}
): ReelCaption[] {
  const maxWords = options.maxWords ?? 6;
  const maxDurationSeconds = options.maxDurationSeconds ?? 2.4;
  const pauseSeconds = options.pauseSeconds ?? 0.35;
  const captions: ReelCaption[] = [];
  let current: ReelWord[] = [];

  const flush = () => {
    if (!current.length) return;
    captions.push({
      startTime: current[0].startTime,
      endTime: current[current.length - 1].endTime,
      words: current,
    });
    current = [];
  };

  for (const word of words) {
    const previous = current[current.length - 1];
    const pause = previous ? word.startTime - previous.endTime : 0;
    const duration = current.length ? word.endTime - current[0].startTime : 0;

    if (
      current.length > 0 &&
      (current.length >= maxWords || pause > pauseSeconds || duration > maxDurationSeconds)
    ) {
      flush();
    }

    current.push(word);

    if (isSentenceEnd(word)) {
      flush();
    }
  }

  flush();

  return captions;
}
