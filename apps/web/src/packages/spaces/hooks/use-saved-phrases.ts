import { useMemo } from 'react';

import { useRecordListQuery } from '@/packages/shared/lib/data';

import { savedPhraseCollection } from '../db';
import { type SavedPhrase, SavedPhraseSchema } from '../types';

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
  const { data, isLoading, error } = useRecordListQuery(
    'saved-phrases',
    savedPhraseCollection,
    SavedPhraseSchema
  );

  // Stable sort by pinned desc keeps pinned phrases first while preserving the
  // created_at order within each group.
  const phrases = useMemo(() => {
    const rows = spaceId ? data.filter(phrase => phrase.space_id === spaceId) : data;
    return [...rows].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [data, spaceId]);

  return { phrases, isLoading, error };
}
