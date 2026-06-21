'use client';

import { useMemo } from 'react';

import { eq, ilike, isUndefined, not } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';

import { noteCollection } from '../db';
import type { Note } from '../types';

export interface UseNotesReturn {
  notes: Note[];
  isLoading: boolean;
  error?: { message: string };
}

export function useNotes({
  scope,
  searchQuery,
  spaceId,
}: {
  scope?: 'global' | 'space-notes';
  searchQuery?: string;
  spaceId?: string;
} = {}): UseNotesReturn {
  const {
    data: notes,
    isLoading,
    isError,
    status,
  } = useLiveQuery(
    q => {
      let query = q.from({ items: noteCollection });
      if (spaceId) {
        query = query.where(({ items }) => eq(items.space_id, spaceId));
      } else if (scope === 'space-notes') {
        query = query.where(({ items }) => not(isUndefined(items.space_id)));
      } else {
        query = query.where(({ items }) => isUndefined(items.space_id));
      }
      if (searchQuery) {
        query = query.where(({ items }) => ilike(items.name, `%${searchQuery}%`));
      }
      return query.orderBy(({ items }) => items.updated_at, 'desc');
    },
    [scope, searchQuery, spaceId]
  );

  const error = useMemo(
    () => (isError ? { message: `Database error: ${status}` } : undefined),
    [isError, status]
  );

  return {
    notes: (notes || []) as Note[],
    isLoading,
    error,
  };
}
