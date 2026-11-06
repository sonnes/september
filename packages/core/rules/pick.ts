/**
 * True when each word of the query is in the text, in any letter case.
 *
 * No words match everything, so a list that has not been searched shows all
 * of its rows.
 */
export function matchesWords(text: string, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const target = text.toLowerCase();
  return words.every((word) => target.includes(word));
}
