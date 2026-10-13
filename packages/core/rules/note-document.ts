/**
 * The rules of a note as a document of Markdown lines.
 *
 * The editor keeps the note as plain Markdown, one string for each line. These
 * rules read a line and change it, so the editor never parses Markdown itself
 * and the stored note stays the text the user typed.
 */

import { markdownToVoiceText } from "./notes.ts";

/** What a line is, by its Markdown prefix. */
export type LineKind =
  | "h1"
  | "h2"
  | "li"
  | "ol"
  | "task"
  | "done"
  | "quote"
  | "hr"
  | "p";

/** A style button of the editor. Each one sets one line prefix. */
export type LineStyle = "h1" | "h2" | "li" | "ol" | "task" | "quote";

/** A place in the document: a line, and a character in that line. */
export interface Point {
  line: number;
  offset: number;
}

/** A piece of a line, for the editor to draw. */
export interface InlinePart {
  text: string;
  role: "lead" | "text" | "mark" | "bold" | "italic";
}

const PREFIX: Record<LineStyle, string> = {
  h1: "# ",
  h2: "## ",
  li: "- ",
  ol: "1. ",
  task: "- [ ] ",
  quote: "> ",
};

/** The prefix of a line that is not part of its words. */
const LEAD = /^(#{1,2} |- \[[ xX]\] |[-*] |\d+\. |> )/;

const INLINE = /\*\*([^*\n]+?)\*\*|\*([^*\n]+?)\*/g;

/** The Markdown prefix of a line, or an empty string. */
export function lineLead(line: string): string {
  return line.match(LEAD)?.[0] ?? "";
}

export function lineKind(line: string): LineKind {
  if (/^# /.test(line)) return "h1";
  if (/^## /.test(line)) return "h2";
  if (/^- \[[xX]\] /.test(line)) return "done";
  if (/^- \[ \] /.test(line)) return "task";
  if (/^[-*] /.test(line)) return "li";
  if (/^\d+\. /.test(line)) return "ol";
  if (/^> /.test(line)) return "quote";
  if (/^---$/.test(line)) return "hr";
  return "p";
}

/** The style button that shows as pressed for a line kind. */
export function styleOf(kind: LineKind): LineStyle | null {
  if (kind === "done") return "task";
  if (kind === "p" || kind === "hr") return null;
  return kind;
}

/**
 * Sets the style of a line, or removes it when the line has it already.
 *
 * The caret stays on the same word. A caret inside the old prefix goes to
 * the start of the words.
 */
export function toggleLineStyle(
  line: string,
  style: LineStyle,
  caret: number,
): { text: string; caret: number } {
  const old = lineLead(line);
  const next = styleOf(lineKind(line)) === style ? "" : PREFIX[style];
  return {
    text: next + line.slice(old.length),
    caret: Math.max(next.length, caret - old.length + next.length),
  };
}

/**
 * Puts a pair of marks, such as `**`, around the selected words.
 *
 * With no selection, the marks go around the word at the caret. With no word
 * at the caret, an empty pair opens with the caret inside it. A trailing space
 * of the selection stays outside the marks.
 */
export function wrapInline(
  line: string,
  start: number,
  end: number,
  mark: string,
): { text: string; caret: number } {
  const words = lineLead(line).length;
  let from = Math.max(start, words);
  let to = Math.max(end, words);

  if (from === to) {
    while (from > words && /\S/.test(line[from - 1])) from--;
    while (to < line.length && /\S/.test(line[to])) to++;
    if (from === to) {
      return {
        text: line.slice(0, from) + mark + mark + line.slice(from),
        caret: from + mark.length,
      };
    }
  }

  const inside = line.slice(from, to).replace(/\s+$/, "");
  const after = from + inside.length;
  return {
    text: line.slice(0, from) + mark + inside + mark + line.slice(after),
    caret: after + mark.length * 2,
  };
}

/**
 * The words of the sentence before the caret, and where they start.
 *
 * The suggestion stripes read these words as their draft. A take puts its
 * words in their place.
 */
export function sentenceBefore(
  line: string,
  caret: number,
): { start: number; text: string } {
  const head = line.slice(0, caret);
  let start = lineLead(line).length;
  const ended = /[.!?]\s+/g;
  for (let found = ended.exec(head); found; found = ended.exec(head)) {
    start = Math.max(start, found.index + found[0].length);
  }
  return { start, text: head.slice(start) };
}

/**
 * The prefix that Enter puts on the next line.
 *
 * A list, a checklist, and a quote go on. A heading and a paragraph do not.
 */
export function nextLead(line: string): string {
  const kind = lineKind(line);
  if (kind === "ol") return `${Number.parseInt(line, 10) + 1}. `;
  if (kind === "task" || kind === "done") return PREFIX.task;
  if (kind === "li" || kind === "quote") return lineLead(line);
  return "";
}

/**
 * Where the word before the caret starts, for Delete word.
 *
 * The word takes the space after it. The prefix of the line is not a word.
 */
export function wordStartBefore(line: string, caret: number): number {
  const words = lineLead(line).length;
  const head = line.slice(words, caret);
  return words + head.replace(/\S+\s*$/, "").length;
}

/**
 * Puts text in the place of a range, and gives the caret after it.
 *
 * A line break in the text starts a new line.
 */
export function replaceRange(
  lines: string[],
  from: Point,
  to: Point,
  text: string,
): { lines: string[]; caret: Point } {
  const before = lines[from.line].slice(0, from.offset);
  const after = lines[to.line].slice(to.offset);
  const parts = text.split("\n");
  const last = parts.length - 1;
  const made = parts.map((part, index) =>
    (index === 0 ? before : "") + part + (index === last ? after : ""),
  );
  return {
    lines: [...lines.slice(0, from.line), ...made, ...lines.slice(to.line + 1)],
    caret: {
      line: from.line + last,
      offset: (last === 0 ? before.length : 0) + parts[last].length,
    },
  };
}

/** The pieces of a line: its prefix, its words, and its bold and italic runs. */
export function inlineParts(line: string): InlinePart[] {
  const lead = lineLead(line);
  const parts: InlinePart[] = lead ? [{ text: lead, role: "lead" }] : [];
  const body = line.slice(lead.length);
  let at = 0;
  for (const found of body.matchAll(INLINE)) {
    const index = found.index ?? 0;
    if (index > at) parts.push({ text: body.slice(at, index), role: "text" });
    const mark = found[1] !== undefined ? "**" : "*";
    parts.push(
      { text: mark, role: "mark" },
      { text: found[1] ?? found[2], role: found[1] !== undefined ? "bold" : "italic" },
      { text: mark, role: "mark" },
    );
    at = index + found[0].length;
  }
  if (at < body.length) parts.push({ text: body.slice(at), role: "text" });
  return parts;
}

/**
 * The line that the list of notes shows under a name.
 *
 * It is the first line of words, without its marks. A line that only repeats
 * the name is skipped, because a new note takes its name from its first words.
 */
export function notePreview(content: string, name: string | null | undefined): string {
  const title = (name ?? "").trim().toLowerCase();
  for (const line of content.split("\n")) {
    const words = markdownToVoiceText(line);
    if (words && words.toLowerCase() !== title) return words;
  }
  return "";
}
