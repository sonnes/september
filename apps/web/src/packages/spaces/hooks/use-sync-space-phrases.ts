import { useEffect, useRef, useState } from 'react';

import { decidePhraseSync } from '../lib/phrases';
import { replaceAiPhrases } from '../mutations';
import { Message, SavedPhrase, Space } from '../types';
import { useGenerateSpacePhrases } from './use-generate-space-phrases';

/** How many recent messages to feed the generator. */
const HISTORY_WINDOW = 20;

export interface UseSyncSpacePhrasesReturn {
  isSyncing: boolean;
}

/**
 * Owns all AI phrase generation triggering for a space:
 * - **Seed / backfill** when a space with history has never been generated
 *   (fires reactively right after the first message).
 * - **Regenerate on open** once per space open when the history has grown stale.
 *
 * Pinned phrases are never touched — `replaceAiPhrases` only rewrites AI rows.
 * AI errors / not-ready providers are swallowed silently.
 */
export function useSyncSpacePhrases({
  space,
  phrases,
  messages,
  messagesLoading,
}: {
  space?: Space;
  phrases: SavedPhrase[];
  messages: Message[];
  messagesLoading: boolean;
}): UseSyncSpacePhrasesReturn {
  const { generatePhrases, isReady } = useGenerateSpacePhrases();
  const inFlight = useRef(false);
  const openCheckedFor = useRef<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!space || messagesLoading || !isReady || inFlight.current) return;

    const action = decidePhraseSync({
      syncedCount: space.phrases_synced_count,
      messageCount: messages.length,
    });
    if (action === 'none') return;

    // A stale-on-open regeneration runs at most once per space open; seeding is
    // reactive (it fires as soon as the first message lands).
    if (action === 'regen') {
      if (openCheckedFor.current === space.id) return;
      openCheckedFor.current = space.id;
    }

    inFlight.current = true;
    setIsSyncing(true);

    const existing = phrases.map(p => p.text);
    const history = messages.slice(-HISTORY_WINDOW).map(m => m.text);
    const messageCount = messages.length;

    generatePhrases({ existing, history, context: space.context })
      .then(ai => {
        if (ai && ai.length > 0) {
          return replaceAiPhrases(space.id, space.user_id, ai, messageCount);
        }
      })
      .catch(() => {
        // No provider / generation failure — leave existing phrases as-is.
      })
      .finally(() => {
        inFlight.current = false;
        setIsSyncing(false);
      });
  }, [space, phrases, messages, messagesLoading, isReady, generatePhrases]);

  return { isSyncing };
}
