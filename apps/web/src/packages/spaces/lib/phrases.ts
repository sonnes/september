/**
 * Pure helpers for per-space saved phrases.
 *
 * Core invariant: regeneration only ever rewrites AI (`pinned === false`)
 * phrases — pinned phrases are never overwritten, reordered, or dropped.
 */

import type { Message, SavedPhrase } from '../types';

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

export type PhraseKind = 'phrase' | 'starter';

/** A row's kind; rows persisted before the field existed are phrases. */
export function rowKind(row: SavedPhrase): PhraseKind {
  return row.kind ?? 'phrase';
}

/** Rows of one kind, pinned first (order preserved within groups), capped at n. */
export function topRows(rows: SavedPhrase[], n: number, kind: PhraseKind): SavedPhrase[] {
  const ofKind = rows.filter(r => rowKind(r) === kind);
  const pinned = ofKind.filter(r => r.pinned);
  const ai = ofKind.filter(r => !r.pinned);
  return [...pinned, ...ai].slice(0, n);
}

/** Pinned phrases first (order preserved), then AI; mapped to text, capped at n. Starters excluded. */
export function topPhrases(rows: SavedPhrase[], n: number): string[] {
  return topRows(rows, n, 'phrase').map(r => r.text);
}

/**
 * Starter word-count bounds — a starter is an opening prefix, not a sentence.
 * The prompt asks for 3-5 words; these are deliberately one word looser on
 * each side so near-miss model output isn't thrown away.
 */
const STARTER_MIN_WORDS = 2;
const STARTER_MAX_WORDS = 6;

/**
 * Clamp LLM starter output in code rather than over-validating the schema:
 * trim, drop blanks, and drop anything outside the tolerance bounds above.
 */
export function sanitizeStarters(starters: string[]): string[] {
  return starters
    .map(s => s.trim())
    .filter(s => {
      if (!s) return false;
      const words = s.split(/\s+/).length;
      return words >= STARTER_MIN_WORDS && words <= STARTER_MAX_WORDS;
    });
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
Given the User's current saved phrases and starters, their space context (who they are talking to and why), and recent conversation history, return:
- "phrases": an updated set of 6-8 short COMPLETE phrases the User is likely to want to say next.
- "starters": 4-6 sentence starters — 3-5 word opening prefixes the User would begin a sentence with (e.g. "Can you please check", "I'm feeling a bit").
</task>

<rules>
- Everything is first person — something the User would SAY (never a reply from someone else).
- In the conversation history, "Me:" lines are the User's own words; "Them:" lines are the other person's. Generate only what the User (Me) would say next.
- Entries marked [pinned] are kept by the app automatically — do NOT return them or near-duplicates of them.
- Your output replaces the unmarked entries: carry forward the ones still worth keeping, drop stale ones, and add what the recent history suggests.
- Phrases are complete, natural, speakable thoughts. Starters are incomplete openings that invite completion.
- STRICTLY keep the same language as the context and history.
- Return 6-8 phrases and 4-6 starters.
</rules>`;

/** A phrase or starter row as embedded in the prompt — pinned rows get a [pinned] marker. */
export interface PromptPhrase {
  text: string;
  pinned: boolean;
}

/** History lines for the phrases prompt — "Me:" is the User, "Them:" transcribed speech. */
export function formatPhraseHistory(messages: Pick<Message, 'type' | 'text'>[]): string[] {
  return messages.map(m => `${m.type === 'transcription' ? 'Them' : 'Me'}: ${m.text}`);
}

function promptRow(p: PromptPhrase): string {
  return p.pinned ? `- [pinned] ${p.text}` : `- ${p.text}`;
}

/**
 * Build the system + user prompt for AI phrase generation. The full existing
 * collection is embedded so the model refines the set rather than re-deriving
 * it blindly; pinned rows are marked so the model can avoid duplicating them.
 */
export function buildPhrasesPrompt({
  existing,
  existingStarters = [],
  history,
  context,
}: {
  existing: PromptPhrase[];
  existingStarters?: PromptPhrase[];
  /** Pre-formatted "Me:"/"Them:" lines — see formatPhraseHistory. */
  history: string[];
  context?: string;
}): { system: string; prompt: string } {
  const sections: string[] = [];

  sections.push(
    existing.length > 0
      ? `Current saved phrases:\n${existing.map(promptRow).join('\n')}`
      : 'Current saved phrases: (none yet)'
  );

  if (existingStarters.length > 0) {
    sections.push(`Current starters:\n${existingStarters.map(promptRow).join('\n')}`);
  }

  const ctx = context?.trim();
  if (ctx) sections.push(`Context:\n${ctx}`);

  if (history.length > 0) {
    sections.push(`Recent conversation ("Me" is the User):\n${history.join('\n')}`);
  }

  return { system: PHRASES_SYSTEM_PROMPT, prompt: sections.join('\n\n') };
}
