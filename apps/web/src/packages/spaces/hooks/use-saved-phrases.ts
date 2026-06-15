import { useMemo } from 'react';

import { eq } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';

import { savedPhraseCollection } from '../db';
import { SavedPhrase } from '../types';

export interface UseSavedPhrasesReturn {
  phrases: SavedPhrase[];
  isLoading: boolean;
  error?: { message: string };
}

/**
 * Live list of a space's saved phrases, ordered pinned-first then by creation
 * time. Used by the suggestion stripe (top 5) and the Phrases tab.
 */
export function useSavedPhrases({ spaceId }: { spaceId?: string } = {}): UseSavedPhrasesReturn {
  const {
    data,
    isLoading,
    isError,
    status,
  } = useLiveQuery(
    q => {
      let query = q.from({ items: savedPhraseCollection });
      if (spaceId) {
        query = query.where(({ items }) => eq(items.space_id, spaceId));
      }
      return query.orderBy(({ items }) => items.created_at, 'asc');
    },
    [spaceId]
  );

  // Stable sort by pinned desc keeps pinned phrases first while preserving the
  // created_at order within each group.
  const phrases = useMemo(() => {
    const rows = (data || []) as SavedPhrase[];
    return [...rows].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [data]);

  const error = useMemo(
    () => (isError ? { message: `Database error: ${status}` } : undefined),
    [isError, status]
  );

  return { phrases, isLoading, error };
}
