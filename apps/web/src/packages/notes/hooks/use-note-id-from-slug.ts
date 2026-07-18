'use client';

import { useMemo } from 'react';

import { entitySlug, idFromSlug } from '@/packages/shared';

import type { Note } from '../types';
import { useNotes } from './use-notes';

/**
 * Resolve an id-free note slug (e.g. "appointment-prep") to its note id by
 * matching against the space's loaded notes. Falls back to a legacy UUID suffix
 * so old `…-<uuid>` links still resolve. Pure — testable without React.
 */
export function noteIdFromSlug(slug: string, notes: Note[]): string | undefined {
  const byName = notes.find(note => entitySlug(note.name, 'note') === slug);
  if (byName) return byName.id;

  const legacyId = idFromSlug(slug);
  return notes.find(note => note.id === legacyId)?.id;
}

export interface UseNoteIdFromSlugReturn {
  noteId: string | undefined;
  isLoading: boolean;
}

/** Reactive slug → note-id resolution within a space. */
export function useNoteIdFromSlug(
  spaceId: string | undefined,
  slug: string
): UseNoteIdFromSlugReturn {
  const { notes, isLoading } = useNotes({ spaceId });
  const noteId = useMemo(() => noteIdFromSlug(slug, notes), [slug, notes]);
  return { noteId, isLoading };
}
