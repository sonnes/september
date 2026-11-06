/** How a note becomes chunks on a stage, one thought at a time. */

import { markdownToVoiceText } from "../notes.ts";
import { sentencesOf } from "../spoken-word.ts";
import type { ChunkRole } from "./stage.ts";

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
const CHUNK_CHARACTER_LIMIT = 140;

/** A line of only dashes or stars ends a section. */
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
