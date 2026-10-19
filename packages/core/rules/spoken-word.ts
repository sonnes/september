/**
 * The word that the voice is reading, by its place in the sentence. A voice
 * reports a character of the text it speaks, and that text can differ from
 * the text on the screen, for example without its audio tags. The place of
 * the word survives the difference.
 */

/** The place of the word that holds a character, counting from 0. */
export function wordAt(text: string, charIndex: number): number {
  const head = text.slice(0, charIndex);
  const before = head.match(/\S+/g)?.length ?? 0;
  // Inside a word, the word started before this character. A character on a
  // space belongs to the word that follows it.
  const inside = /\S$/.test(head) && /\S/.test(text.charAt(charIndex));
  return inside ? before - 1 : before;
}

/** The text cut into words and the spaces between them. */
export function wordsOf(text: string): { text: string; word: number | null }[] {
  const parts: { text: string; word: number | null }[] = [];
  let word = 0;
  for (const piece of text.split(/(\s+)/)) {
    if (!piece) continue;
    parts.push({ text: piece, word: /^\s+$/.test(piece) ? null : word++ });
  }
  return parts;
}
