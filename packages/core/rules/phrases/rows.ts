/**
 * The saved phrases of a space as the stripe and the panel use them.
 *
 * A regeneration rewrites only the rows that are not pinned. A phrase that the
 * user keeps is never moved and never lost.
 */

import type { PhraseKind, SavedPhrase } from "../records.ts";

/**
 * The AI texts with any case-insensitive match of a pinned text removed, and
 * with intra-list duplicates dropped (first occurrence kept). Blank texts are
 * skipped.
 */
export function dedupeAgainstPinned(pinnedTexts: string[], aiTexts: string[]): string[] {
  const pinned = new Set(pinnedTexts.map(t => t.trim().toLowerCase()));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const text of aiTexts) {
    const key = text.trim().toLowerCase();
    if (!key || pinned.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

/** Rows of one kind, pinned first (order preserved within groups), capped at n. */
export function topRows(rows: SavedPhrase[], n: number, kind: PhraseKind): SavedPhrase[] {
  const ofKind = rows.filter(r => r.kind === kind);
  const pinned = ofKind.filter(r => r.pinned);
  const ai = ofKind.filter(r => !r.pinned);
  return [...pinned, ...ai].slice(0, n);
}

/** Pinned phrases first (order preserved), then AI; mapped to text, capped at n. Starters excluded. */
export function topPhrases(rows: SavedPhrase[], n: number): string[] {
  return topRows(rows, n, 'phrase').map(r => r.text);
}

/**
 * Whether the user keeps a phrase with this text.
 *
 * The stripe carries text only, not the row it came from, so the pin in the
 * gutter asks here. The panel reads `row.pinned` directly.
 */
export function isKept(text: string, rows: SavedPhrase[]): boolean {
  const key = text.trim().toLowerCase();
  return rows.some(r => r.pinned && r.text.trim().toLowerCase() === key);
}
