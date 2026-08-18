'use client';

import { useMemo } from 'react';

import { useRecordListQuery } from '@/packages/shared/lib/data';

import { noteCollection } from '../db';
import { type Note, NoteSchema } from '../types';

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
  const { data, isLoading, error } = useRecordListQuery('documents', noteCollection, NoteSchema);
  const notes = useMemo(() => {
    const search = searchQuery?.toLowerCase();
    return data
      .filter(note => {
        const matchesScope = spaceId
          ? note.space_id === spaceId
          : scope === 'space-notes'
            ? note.space_id !== undefined
            : note.space_id === undefined;
        return matchesScope && (!search || note.name?.toLowerCase().includes(search));
      })
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  }, [data, scope, searchQuery, spaceId]);

  return {
    notes,
    isLoading,
    error,
  };
}
