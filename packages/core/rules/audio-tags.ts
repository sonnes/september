/**
 * Audio tags: directions to the voice in square brackets, such as `[laughs]`.
 *
 * Eleven v3 reads a tag as a direction and does not say it. Every other voice
 * says the words inside the brackets, so a tag reaches only Eleven v3. The
 * draft, a message, and a phrase keep their tags, and the tags are removed on
 * the way to a voice that cannot read them.
 */

import { DIALOGUE_MODEL, stabilityFor } from "./voice.ts";

/** One tag, as a whole token. */
const TAG = /^\[[^\[\]]+\]$/;
/** Every tag in a text. */
const TAGS = /\[[^\[\]]+\]/g;

export const isTag = (token: string): boolean => TAG.test(token);

/** The words inside the brackets, for a chip. */
export const tagLabel = (tag: string): string => tag.slice(1, -1).trim();

/** The text without its tags, and without the spaces that the tags leave. */
export const stripTags = (text: string): string =>
  text
    .replace(TAGS, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

/** The fields of the voice settings that decide what a voice reads. */
export interface TagVoice {
  provider: string;
  modelId: string;
}

/** True when the voice in use reads tags: Eleven v3, alone or in Dialogue. */
export const tagsSpoken = (voice: TagVoice): boolean =>
  voice.provider === "dialogue" ||
  (voice.provider === "elevenlabs" && voice.modelId === DIALOGUE_MODEL);

/** The text that this voice receives. */
export const speakableText = (text: string, voice: TagVoice): string =>
  tagsSpoken(voice) ? text : stripTags(text);

/**
 * The words and the settings of a speech file. The Dialogue voice makes its
 * files with Eleven v3 on the text-to-speech endpoint, because an export needs
 * an MP3 file. The file takes the stability mode that the Dialogue voice
 * streams with, and the normal speed, because the Dialogue voice has no speed.
 * A voice that says tags aloud gets the words alone.
 */
export function fileSound<V extends TagVoice & { stability: number; speed: number }>(
  text: string,
  voice: V,
): { text: string; settings: V } {
  return {
    text: speakableText(text, voice),
    settings:
      voice.provider === "dialogue"
        ? {
            ...voice,
            modelId: DIALOGUE_MODEL,
            stability: stabilityFor(DIALOGUE_MODEL, voice.stability),
            speed: 1,
          }
        : voice,
  };
}

/** The most tag tiles in the word row. */
const MAX_TAG_TILES = 2;

/**
 * The word row, with its tag tiles after the words.
 *
 * The tags that the engine learned come first, then the example tags of the
 * mood. A tag that the draft already holds is not offered again. A voice that
 * does not read tags gets no tag tiles.
 */
export function wordRow(
  found: readonly string[],
  { tags, examples, draft }: { tags: boolean; examples: readonly string[]; draft: string },
): string[] {
  const words = found.filter((word) => !isTag(word));
  if (!tags || !draft.trim()) return words;

  const held = new Set(draft.match(TAGS) ?? []);
  const offered = [
    ...found.filter(isTag),
    ...examples.map((example) => `[${example}]`),
  ].filter((tag, index, all) => !held.has(tag) && all.indexOf(tag) === index);
  return [...words, ...offered.slice(0, MAX_TAG_TILES)];
}

/**
 * The tag that ends at the caret, across at most one space, or null.
 *
 * Backspace there removes the whole tag, because a half tag is neither a
 * word nor a direction.
 */
export function tagBefore(
  text: string,
  caret: number,
): { start: number; end: number } | null {
  const before = text.slice(0, caret);
  const found = before.match(/\[[^\[\]]+\] ?$/);
  return found?.index === undefined ? null : { start: found.index, end: caret };
}

/** The draft in order, as runs of words and single tags, for the chip layer. */
export function draftParts(text: string): { text: string; tag: boolean }[] {
  return text
    .split(/(\[[^\[\]]+\])/)
    .filter(Boolean)
    .map((part) => ({ text: part, tag: isTag(part) }));
}
