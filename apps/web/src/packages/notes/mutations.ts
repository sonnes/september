import { v4 as uuidv4 } from 'uuid';

import { noteCollection } from './db';
import type { CreateNoteData, Note, UpdateNoteData } from './types';

/**
 * Insert a new note and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function createNote(data: CreateNoteData): Promise<Note> {
  const now = new Date();
  const note: Note = {
    ...data,
    id: data.id ?? uuidv4(),
    created_at: data.created_at ?? now,
    updated_at: data.updated_at ?? now,
  };
  const tx = noteCollection.insert(note);
  await tx.isPersisted.promise;
  return note;
}

/**
 * Update a note by id and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function updateNote(id: string, updates: UpdateNoteData): Promise<void> {
  const tx = noteCollection.update(id, draft => {
    Object.assign(draft, { ...updates, updated_at: new Date() });
  });
  await tx.isPersisted.promise;
}

/**
 * Delete a note by id and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function deleteNote(id: string): Promise<void> {
  const tx = noteCollection.delete(id);
  await tx.isPersisted.promise;
}

/**
 * Delete every note scoped to a space and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function deleteNotesForSpace(spaceId: string): Promise<void> {
  const ids = noteCollection.toArray.filter(note => note.space_id === spaceId).map(note => note.id);
  const txs = ids.map(id => noteCollection.delete(id));
  await Promise.all(txs.map(tx => tx.isPersisted.promise));
}
