/**
 * The pure rules of a note. A test reads them here, without a renderer.
 *
 * A note holds long text that the user writes over minutes or days, and hears
 * back in the chosen voice. Talk holds one sentence, said now.
 *
 * These rules are a port of `packages/notes/lib/title.ts` and
 * `markdownToVoiceText` in the web app. Change them in both apps, or in
 * neither.
 */

import { slugify } from "./spaces.ts";

/** What the title field shows while a note has no name of its own. */
export const UNTITLED_NOTE = "Untitled note";

/** Whether the note still waits for a name. */
export function noteNameIsUnset(name: string | null | undefined): boolean {
  const trimmed = name?.trim();
  return !trimmed || trimmed.toLowerCase() === UNTITLED_NOTE.toLowerCase();
}

/** How many words of the note make its name. */
const NAME_WORDS = 6;
const NAME_LIMIT = 64;

/**
 * A name for the note, from its first words.
 *
 * A user who cannot speak types slowly, so September must not ask for a title
 * before the writing starts. The first words give one instead.
 */
export function noteNameFromContent(content: string): string | undefined {
  const text = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return undefined;

  const name = text.split(/\s+/).slice(0, NAME_WORDS).join(" ");
  return name.length > NAME_LIMIT
    ? `${name.slice(0, NAME_LIMIT - 3).trimEnd()}...`
    : name;
}

/** The fields one save writes. The first save also gives the note a name. */
export function noteContentUpdates(
  name: string | undefined,
  content: string,
): { content: string; name?: string } {
  const made = noteNameIsUnset(name) ? noteNameFromContent(content) : undefined;
  return made ? { content, name: made } : { content };
}

/**
 * The note with the composed words under it.
 *
 * The composer holds one sentence at a time, the same as in Talk. A blank
 * line between the parts keeps each one its own paragraph in markdown.
 */
export function appendToNote(content: string, text: string): string {
  const words = text.trim();
  if (!words) return content;
  return content.trim() ? `${content.trimEnd()}\n\n${words}` : words;
}

/** The URL name of a note. It carries no identifier. */
export const noteSlug = (name: string | null | undefined) =>
  slugify(name, "note");

/** The note that a slug names, or nothing when no name matches. */
export function noteFromSlug<T extends { name?: string | null }>(
  slug: string,
  notes: readonly T[],
): T | undefined {
  return notes.find((note) => noteSlug(note.name) === slug);
}

/**
 * The words of a note, with the markup removed.
 *
 * A voice must say `Monday`, not `# Monday`. Nothing here changes the note
 * itself, so the markup stays on the screen and in SQLite.
 */
export function markdownToVoiceText(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
