'use client';

import { useMemo } from 'react';

import { eq } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';

import { noteCollection } from '../db';
import type { Note } from '../types';

export interface UseNoteReturn {
  note: Note | undefined;
  isLoading: boolean;
  error?: { message: string };
}

export function useNote(id?: string): UseNoteReturn {
  const { data, isLoading, isError, status } = useLiveQuery(
    q => {
      let query = q.from({ items: noteCollection });
      if (id) {
        query = query.where(({ items }) => eq(items.id, id));
      }
      return query;
    },
    [id]
  );

  const error = useMemo(
    () => (isError ? { message: `Database error: ${status}` } : undefined),
    [isError, status]
  );

  return {
    // Without an id the query is unfiltered — never surface an arbitrary note
    note: id ? data?.[0] : undefined,
    isLoading,
    error,
  };
}
