/**
 * The pure rules of presenting and exporting a note.
 *
 * A note holds prepared words. Present puts them on the whole screen, one
 * chunk at a time, for the person in the room or on the call. Export writes
 * the same words to a file: the text, the voice, or a video of both.
 *
 * Everything here is a rule, so a test reads it without a renderer, and the
 * live screen and the exported video agree on the same numbers.
 */

// A node test loads this file directly, and node does not resolve `@/`.
import { markdownToVoiceText, noteSlug } from "./notes.ts";

// ------------------------------------------------------------------- tones

export type PresentToneKey =
  | "indigo"
  | "ink"
  | "paper"
  | "cream"
  | "sage"
  | "blush"
  | "sky";

/**
 * Keycap tones are the system: Noto Sans on the app's own colours. Reading
 * tones are paper tints with a serif display face, for a long story read at a
 * distance.
 */
export type PresentToneFamily = "keycap" | "reading";

export interface PresentTone {
  key: PresentToneKey;
  name: string;
  family: PresentToneFamily;
  /** The whole stage, and the whole video frame. */
  background: string;
  /** The colour of a display chunk. */
  display: string;
  /** The colour of a support chunk. */
  support: string;
  /** The word being spoken now. */
  accent: string;
  /** The corner signature: the Sep keycap, or the ink wordmark. */
  mark: "keycap" | "wordmark";
}

/**
 * Seven tones in one picker. The first three are the app's own colours; the
 * last four are paper tints for reading.
 */
export const PRESENT_TONES: PresentTone[] = [
  {
    key: "indigo",
    name: "Indigo",
    family: "keycap",
    background: "#4f46e5",
    display: "#ffffff",
    support: "#e0e7ff",
    accent: "#c7d2fe",
    mark: "keycap",
  },
  {
    key: "ink",
    name: "Ink",
    family: "keycap",
    background: "#09090b",
    display: "#fafafa",
    support: "#d4d4d8",
    accent: "#a5b4fc",
    mark: "keycap",
  },
  {
    key: "paper",
    name: "Paper",
    family: "keycap",
    background: "#ffffff",
    display: "#18181b",
    support: "#3f3f46",
    accent: "#4f46e5",
    mark: "keycap",
  },
  {
    key: "cream",
    name: "Cream",
    family: "reading",
    background: "#faf6ec",
    display: "#1c1b18",
    support: "#44403c",
    accent: "#b45309",
    mark: "wordmark",
  },
  {
    key: "sage",
    name: "Sage",
    family: "reading",
    background: "#eef4ee",
    display: "#1c1b18",
    support: "#3f3f46",
    accent: "#047857",
    mark: "wordmark",
  },
  {
    key: "blush",
    name: "Blush",
    family: "reading",
    background: "#faf0f0",
    display: "#1c1b18",
    support: "#44403c",
    accent: "#be123c",
    mark: "wordmark",
  },
  {
    key: "sky",
    name: "Sky",
    family: "reading",
    background: "#eef4fa",
    display: "#1c1b18",
    support: "#3f3f46",
    accent: "#0369a1",
    mark: "wordmark",
  },
];

export const DEFAULT_TONE: PresentToneKey = "indigo";

const TONE_BY_KEY = new Map(PRESENT_TONES.map((tone) => [tone.key, tone]));

/** The tone a key names. A key that no longer exists falls back. */
export function presentTone(key: PresentToneKey): PresentTone {
  return TONE_BY_KEY.get(key) ?? TONE_BY_KEY.get(DEFAULT_TONE)!;
}

// ------------------------------------------------------------------- roles

/** A chunk opens a section, or continues one. */
export type ChunkRole = "display" | "support";

export interface RoleSpec {
  fontFamily: string;
  fontWeight: number;
  lineHeightRatio: number;
  /** The largest font size, as a share of the stage width. */
  maxFontRatio: number;
  /** The smallest font size, as a share of the stage width. */
  minFontRatio: number;
  /** The share of the stage height the words may fill. */
  boxHeightRatio: number;
}

const NOTO = '"Noto Sans", sans-serif';
const FRAUNCES = '"Fraunces Variable", "Fraunces", serif';

/**
 * The face and the size of a chunk.
 *
 * Only the paper tints take the serif, and only for a display chunk. Support
 * text stays in Noto Sans everywhere, because it carries the sentences a
 * partner reads.
 */
export function roleSpec(role: ChunkRole, family: PresentToneFamily): RoleSpec {
  if (role === "display") {
    return {
      fontFamily: family === "reading" ? FRAUNCES : NOTO,
      fontWeight: family === "reading" ? 550 : 700,
      lineHeightRatio: 1.08,
      maxFontRatio: 0.28,
      minFontRatio: 0.055,
      boxHeightRatio: 0.62,
    };
  }

  return {
    fontFamily: NOTO,
    fontWeight: 500,
    lineHeightRatio: 1.35,
    maxFontRatio: 0.095,
    minFontRatio: 0.03,
    boxHeightRatio: 0.56,
  };
}

/** A word already spoken stays on the stage, dimmed. */
export const SPOKEN_OPACITY = 0.55;
/** A word not yet spoken. */
export const UNSPOKEN_OPACITY = 0.88;

/** The empty margin down each side of the stage. */
export const STAGE_PADDING_RATIO = 0.07;

/** About how wide one glyph is, as a share of the font size. */
const GLYPH_WIDTH_RATIO = 0.52;

/**
 * The font size of a chunk, as a share of the stage width.
 *
 * The stage is one colour and one thought, so the words take as much of it as
 * they can. `aspect` is the stage height over its width, which is why a Mac in
 * landscape and a 9:16 video frame reach different sizes from the same words.
 */
export function chunkFontRatio(
  text: string,
  role: ChunkRole,
  aspect: number,
): number {
  const spec = roleSpec(role, "keycap");
  const characters = text.trim().length;
  if (!characters || aspect <= 0) return spec.maxFontRatio;

  const usableWidth = 1 - STAGE_PADDING_RATIO * 2;
  const usableHeight = spec.boxHeightRatio * aspect;
  // Lines of text grow with the font size, and so does the height of each
  // line, so the height the words need grows with its square.
  const fitted = Math.sqrt(
    (usableHeight * usableWidth) /
      (characters * GLYPH_WIDTH_RATIO * spec.lineHeightRatio),
  );

  return Math.min(spec.maxFontRatio, Math.max(spec.minFontRatio, fitted));
}

// ---------------------------------------------------------------- chunking

/** A chunk holds one thought, said in one breath. */
export interface PresentChunk {
  text: string;
  role: ChunkRole;
  /**
   * What the stage draws. Only words today; a note that carries a picture
   * gives it a chunk of its own.
   */
  kind: "text";
  /** Which part of the note it came from, counting the section breaks. */
  section: number;
}

/** The longest chunk a stage shows at once. */
export const CHUNK_CHARACTER_LIMIT = 140;

/** A line of only dashes or stars ends a section, as it did in the old slides. */
const SECTION_BREAK = /^[ \t]*(?:-{3,}|\*{3,})[ \t]*$/m;
const HEADING = /^\s*#{1,6}\s+/;
const LIST_ITEM = /^\s*(?:[-*+]\s+|\d+[.)]\s+)/;
const CLAUSE_MARKS = ",;:—–";

/**
 * The blocks of one section: a paragraph, a heading, or a line of a list.
 *
 * A heading and a list row each stand alone, because each one is a thought the
 * writer already separated.
 */
function blocksOf(section: string): string[] {
  const blocks: string[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) blocks.push(paragraph.join("\n"));
    paragraph = [];
  };

  for (const line of section.split("\n")) {
    if (!line.trim()) {
      flush();
      continue;
    }
    if (HEADING.test(line) || LIST_ITEM.test(line)) {
      flush();
      blocks.push(line);
      continue;
    }
    paragraph.push(line);
  }

  flush();
  return blocks;
}

/** One sentence at a time, keeping the mark that ends it. */
function sentencesOf(text: string): string[] {
  return (text.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** The parts of a sentence, cut where the writer paused. */
function clausesOf(text: string): string[] {
  const clauses: string[] = [];
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    if (!CLAUSE_MARKS.includes(text[i]!)) continue;
    let end = i + 1;
    if (end >= text.length || !/\s/.test(text[end]!)) continue;

    clauses.push(text.slice(start, end));
    while (end < text.length && /\s/.test(text[end]!)) end += 1;
    start = end;
    i = end - 1;
  }

  if (start < text.length) clauses.push(text.slice(start));
  return clauses;
}

/** Joins the pieces back into chunks, none longer than the limit. */
function gather(pieces: string[]): string[] {
  const chunks: string[] = [];

  for (const piece of pieces) {
    const last = chunks[chunks.length - 1];
    if (last && `${last} ${piece}`.length <= CHUNK_CHARACTER_LIMIT) {
      chunks[chunks.length - 1] = `${last} ${piece}`;
    } else {
      chunks.push(piece);
    }
  }

  return chunks;
}

/**
 * One sentence, cut down to what a stage can hold.
 *
 * A sentence longer than the limit is cut where the writer paused. A sentence
 * with no pause in it is cut between words, because a chunk that runs off the
 * stage is worse than one that ends early.
 */
function piecesOf(sentence: string): string[] {
  if (sentence.length <= CHUNK_CHARACTER_LIMIT) return [sentence];

  const clauses = clausesOf(sentence);
  const parts = clauses.length > 1 ? gather(clauses) : [sentence];

  return parts.flatMap((part) =>
    part.length <= CHUNK_CHARACTER_LIMIT ? [part] : gather(part.split(/\s+/)),
  );
}

/**
 * The note, ready to present.
 *
 * The markup never reaches the stage, the same way it never reaches the voice.
 * A heading is a title card, and the first words of a section open it; the
 * rest of the section follows in the support size.
 */
export function presentChunks(content: string): PresentChunk[] {
  const chunks: PresentChunk[] = [];
  let section = 0;

  for (const raw of content.split(SECTION_BREAK)) {
    let opened = false;

    for (const block of blocksOf(raw)) {
      const heading = HEADING.test(block);
      const words = markdownToVoiceText(block);
      if (!words) continue;

      for (const sentence of sentencesOf(words)) {
        for (const text of piecesOf(sentence)) {
          const role: ChunkRole = heading || !opened ? "display" : "support";
          if (!heading) opened = true;
          chunks.push({ text, role, kind: "text", section });
        }
      }
    }

    if (opened || chunks[chunks.length - 1]?.section === section) section += 1;
  }

  return chunks;
}

// -------------------------------------------------------- moving through it

/** The chunk a press lands on. The first and the last one hold. */
export function stepChunk(index: number, total: number, delta: number): number {
  if (total <= 0) return 0;
  return Math.min(total - 1, Math.max(0, index + delta));
}

/** How much of the note has been shown, from 0 to 1. */
export function chunkProgress(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, (index + 1) / total);
}

// ------------------------------------------------------- timing for a video

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

export interface CaptionOptions {
  maxWords?: number;
  maxDurationSeconds?: number;
  pauseSeconds?: number;
}

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
 * This is the timing the retired reel exporter used. It is kept as it was,
 * because a caption that changes every six words reads on a phone held at
 * arm's length.
 */
export function wordsToCaptions(
  words: TimedWord[],
  options: CaptionOptions = {},
): Caption[] {
  const maxWords = options.maxWords ?? 6;
  const maxDurationSeconds = options.maxDurationSeconds ?? 2.4;
  const pauseSeconds = options.pauseSeconds ?? 0.35;
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
      (current.length >= maxWords ||
        pause > pauseSeconds ||
        duration > maxDurationSeconds)
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

/** The caption on screen at a moment: the last one that has started. */
export function activeCaptionIndex(
  captions: Caption[],
  currentTime: number,
): number {
  if (!captions.length) return -1;

  let index = 0;
  for (let i = 0; i < captions.length; i++) {
    if (currentTime >= captions[i]!.startTime) index = i;
    else break;
  }

  return index;
}

/** How far the sound has moved through one caption, from 0 to 1. */
export function captionProgress(caption: Caption, currentTime: number): number {
  const span = caption.endTime - caption.startTime;
  if (span <= 0) return currentTime >= caption.endTime ? 1 : 0;

  return Math.max(0, Math.min(1, (currentTime - caption.startTime) / span));
}

// ------------------------------------------------------------------ export

export type ExportKind = "text" | "audio" | "video";

export interface ExportArtifact {
  kind: ExportKind;
  name: string;
  extension: "md" | "mp3" | "mp4";
  /** What the file is for, in one line under the name. */
  hint: string;
}

export const EXPORT_ARTIFACTS: ExportArtifact[] = [
  {
    kind: "text",
    name: "Text",
    extension: "md",
    hint: "The words of the note, to send or to keep.",
  },
  {
    kind: "audio",
    name: "Audio",
    extension: "mp3",
    hint: "The note read in your voice.",
  },
  {
    kind: "video",
    name: "Video",
    extension: "mp4",
    hint: "A story film of the words in your voice.",
  },
];

const EXTENSION: Record<ExportKind, string> = {
  text: "md",
  audio: "mp3",
  video: "mp4",
};

/** The name of the saved file. It carries the name of the note, never an id. */
export function exportFileName(
  name: string | null | undefined,
  kind: ExportKind,
): string {
  return `${noteSlug(name)}.${EXTENSION[kind]}`;
}

export interface ExportReadiness {
  provider: string;
  voiceId: string | null;
  /** Whether this app can render a video at all. */
  video: boolean;
}

/**
 * Why an artifact cannot be saved yet, or nothing when it can.
 *
 * The words always save, on either app, with no service connected. Anything
 * with a voice in it needs the cloud voice, because only that one returns the
 * timing a caption needs.
 */
export function exportReason(
  kind: ExportKind,
  { provider, voiceId, video }: ExportReadiness,
): string | null {
  if (kind === "text") return null;
  if (kind === "video" && !video) return "Video comes from the browser app for now.";
  if (provider !== "elevenlabs") return "Uses your ElevenLabs voice.";
  if (!voiceId) return "Choose an ElevenLabs voice first.";
  return null;
}

// ---------------------------------------------------------------- remembered

/** What the app remembers between presentations. */
export interface PresentSettings {
  tone: PresentToneKey;
  spoken: boolean;
}

/**
 * The saved answer, or the one to start from.
 *
 * A presentation speaks unless the user turned the sound off, because a note
 * is written to be heard.
 */
export function presentSettings(saved: unknown): PresentSettings {
  const value = (saved ?? {}) as Partial<PresentSettings>;
  const tone = TONE_BY_KEY.has(value.tone as PresentToneKey)
    ? (value.tone as PresentToneKey)
    : DEFAULT_TONE;

  return { tone, spoken: value.spoken !== false };
}
