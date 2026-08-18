import { v4 as uuidv4 } from 'uuid';

import {
  deleteDesktopRecord,
  getDesktopRecord,
  isDesktopRuntime,
  listDesktopRecords,
  putDesktopRecord,
} from '@/packages/shared/lib/data';

import { noteCollection } from './db';
import { type CreateNoteData, type Note, NoteSchema, type UpdateNoteData } from './types';

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
  if (isDesktopRuntime()) {
    await putDesktopRecord('documents', note.id, note, note.updated_at.getTime());
    return note;
  }
  const tx = noteCollection.insert(note);
  await tx.isPersisted.promise;
  return note;
}

/**
 * Update a note by id and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function updateNote(id: string, updates: UpdateNoteData): Promise<void> {
  if (isDesktopRuntime()) {
    const current = await getDesktopRecord<Note>('documents', id);
    if (!current) throw new Error(`Note not found: ${id}`);
    const next = NoteSchema.parse({ ...current, ...updates, updated_at: new Date() });
    await putDesktopRecord('documents', id, next, next.updated_at.getTime());
    return;
  }
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
  if (isDesktopRuntime()) {
    await deleteDesktopRecord('documents', id);
    return;
  }
  const tx = noteCollection.delete(id);
  await tx.isPersisted.promise;
}

/**
 * Delete every note scoped to a space and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function deleteNotesForSpace(spaceId: string): Promise<void> {
  if (isDesktopRuntime()) {
    const notes = (await listDesktopRecords('documents')).map(note => NoteSchema.parse(note));
    const ids = notes.filter(note => note.space_id === spaceId).map(note => note.id);
    await Promise.all(ids.map(id => deleteDesktopRecord('documents', id)));
    return;
  }
  const ids = noteCollection.toArray.filter(note => note.space_id === spaceId).map(note => note.id);
  const txs = ids.map(id => noteCollection.delete(id));
  await Promise.all(txs.map(tx => tx.isPersisted.promise));
}
