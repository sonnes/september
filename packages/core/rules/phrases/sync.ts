/** When a space gets new phrases from a model. */

/** A model writes new phrases once this many messages arrive after the last sync. */
const PHRASES_STALE_AFTER = 6;

const STARTER_MIN_WORDS = 2;
const STARTER_MAX_WORDS = 6;

/**
 * The starters a model wrote, trimmed, with blanks and wrong lengths left out.
 * The prompt asks for 3 to 5 words, and a near miss of one word stays.
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

export type PhraseSyncAction = 'seed' | 'regen' | 'none';

/** Whether to seed the phrases of a space, write them again, or do nothing. */
export function decidePhraseSync({
  syncedCount,
  messageCount,
  hasContext = false,
}: {
  syncedCount: number | undefined;
  messageCount: number;
  /**
   * The space holds a note. A note alone is enough for a model to write the
   * first phrases of a space that holds no message yet.
   */
  hasContext?: boolean;
}): PhraseSyncAction {
  if (syncedCount == null) {
    return messageCount >= 1 || hasContext ? 'seed' : 'none';
  }
  return messageCount - syncedCount >= PHRASES_STALE_AFTER ? 'regen' : 'none';
}
