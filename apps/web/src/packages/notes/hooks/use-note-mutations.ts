'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useOptimisticRecordMutation } from '@/packages/shared/lib/data';

import { createNote, deleteNote, updateNote } from '../mutations';
import type { CreateNoteData, Note, UpdateNoteData } from '../types';

export function useCreateNoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNoteData) => createNote(data),
    networkMode: 'always',
    onSuccess: note => {
      queryClient.setQueryData<Note[]>(['notes'], current => [...(current ?? []), note]);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });
}

export interface UpdateNoteVariables {
  id: string;
  updates: UpdateNoteData;
}

export function optimisticUpdateNote(
  current: Note[] | undefined,
  { id, updates }: UpdateNoteVariables
): Note[] {
  return (current ?? []).map(note =>
    note.id === id ? { ...note, ...updates, updated_at: new Date() } : note
  );
}

export function optimisticDeleteNote(current: Note[] | undefined, id: string): Note[] {
  return (current ?? []).filter(note => note.id !== id);
}

export function useUpdateNoteMutation() {
  return useOptimisticRecordMutation<void, UpdateNoteVariables, Note[]>({
    queryKey: ['notes'],
    mutationFn: ({ id, updates }) => updateNote(id, updates),
    update: optimisticUpdateNote,
  });
}

export function useDeleteNoteMutation() {
  return useOptimisticRecordMutation<void, string, Note[]>({
    queryKey: ['notes'],
    mutationFn: deleteNote,
    update: optimisticDeleteNote,
  });
}
