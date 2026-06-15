/**
 * Pure helpers for per-space saved phrases.
 *
 * Core invariant: regeneration only ever rewrites AI (`pinned === false`)
 * phrases — pinned phrases are never overwritten, reordered, or dropped.
 */

import type { SavedPhrase } from '../types';

/** Regenerate AI phrases once this many new messages accrue since the last sync. */
export const PHRASES_STALE_AFTER = 6;

/**
 * The AI texts with any case-insensitive match of a pinned text removed, and
 * with intra-list duplicates dropped (first occurrence kept). Blank texts are
 * skipped. Drives `replaceAiPhrases`.
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

/** Pinned phrases first (order preserved), then AI; mapped to text, capped at n. */
export function topPhrases(rows: SavedPhrase[], n: number): string[] {
  const pinned = rows.filter(r => r.pinned);
  const ai = rows.filter(r => !r.pinned);
  return [...pinned, ...ai].slice(0, n).map(r => r.text);
}

/** Whether AI phrases are stale relative to the conversation length. */
export function isStale(
  syncedCount: number | undefined,
  messageCount: number,
  threshold: number
): boolean {
  if (syncedCount == null) return messageCount >= 1;
  return messageCount - syncedCount >= threshold;
}

export type PhraseSyncAction = 'seed' | 'regen' | 'none';

/**
 * Decide whether to seed (never generated yet), regenerate (seeded but stale),
 * or do nothing for a space's AI phrases.
 */
export function decidePhraseSync({
  syncedCount,
  messageCount,
  threshold = PHRASES_STALE_AFTER,
}: {
  syncedCount: number | undefined;
  messageCount: number;
  threshold?: number;
}): PhraseSyncAction {
  if (syncedCount == null) return messageCount >= 1 ? 'seed' : 'none';
  return messageCount - syncedCount >= threshold ? 'regen' : 'none';
}

const PHRASES_SYSTEM_PROMPT = `You maintain a short list of ready-to-speak phrases for a User with speech or motor difficulties, so they can communicate with fewer keystrokes.

<task>
Given the User's current saved phrases, their space context (who they are talking to and why), and recent conversation history, return an updated set of 6-8 short phrases the User is likely to want to say next.
</task>

<rules>
- Every phrase is first person — something the User would SAY (never a reply from someone else).
- Keep the good existing ideas, drop stale ones, and add what the recent history suggests.
- Short, natural, speakable — sentence starters or full short phrases.
- Avoid near-duplicates of the existing phrases (especially the pinned ones).
- STRICTLY keep the same language as the context and history.
- Return between 6 and 8 phrases.
</rules>`;

/**
 * Build the system + user prompt for AI phrase generation. The full existing
 * collection is embedded so the model refines the set rather than re-deriving
 * it blindly.
 */
export function buildPhrasesPrompt({
  existing,
  history,
  context,
}: {
  existing: string[];
  history: string[];
  context?: string;
}): { system: string; prompt: string } {
  const sections: string[] = [];

  sections.push(
    existing.length > 0
      ? `Current saved phrases:\n${existing.map(p => `- ${p}`).join('\n')}`
      : 'Current saved phrases: (none yet)'
  );

  const ctx = context?.trim();
  if (ctx) sections.push(`Context:\n${ctx}`);

  if (history.length > 0) {
    sections.push(`Recent things the User has said:\n${history.map(h => `- ${h}`).join('\n')}`);
  }

  return { system: PHRASES_SYSTEM_PROMPT, prompt: sections.join('\n\n') };
}
