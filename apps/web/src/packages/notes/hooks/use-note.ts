'use client';

import { useRecordListQuery } from '@/packages/shared/lib/data';

import { noteCollection } from '../db';
import { type Note, NoteSchema } from '../types';

export interface UseNoteReturn {
  note: Note | undefined;
  isLoading: boolean;
  error?: { message: string };
}

export function useNote(id?: string): UseNoteReturn {
  const { data, isLoading, error } = useRecordListQuery('documents', noteCollection, NoteSchema);

  return {
    // Without an id the query is unfiltered — never surface an arbitrary note
    note: id ? data.find(note => note.id === id) : undefined,
    isLoading,
    error,
  };
}
