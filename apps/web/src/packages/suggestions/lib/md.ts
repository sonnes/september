/**
 * Parse curated bullet phrases from a markdown context document.
 *
 * Rules:
 * - Matches lines of the form `- text` or `* text` (leading whitespace allowed)
 * - Trims captured text; drops empties
 * - Ignores prose paragraphs, headings, and blank lines
 * - De-duplicates case-insensitively, preserving first occurrence
 * - Handles CRLF line endings
 */
export function parseMdPhrases(markdown: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const rawLine of markdown.split(/\r?\n/)) {
    const match = rawLine.match(/^\s*[-*]\s+(.+)$/);
    if (!match) continue;
    const phrase = match[1].trim();
    if (!phrase) continue;
    const key = phrase.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(phrase);
  }

  return out;
}
