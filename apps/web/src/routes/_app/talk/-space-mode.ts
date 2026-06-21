import { entitySlug } from '@/packages/shared';

export type SpaceMode = 'talk' | 'notes';

export function routeForSpaceMode(mode: SpaceMode): '/talk/$spaceSlug' | '/notes/$spaceSlug' {
  return mode === 'notes' ? '/notes/$spaceSlug' : '/talk/$spaceSlug';
}

export function shouldShowSpaceSidePanel(_mode: SpaceMode, open: boolean): boolean {
  return open;
}

export function notesRouteParams(
  spaceTitle: string | undefined,
  spaceId: string,
  noteTitle?: string,
  noteId?: string
) {
  return {
    spaceSlug: entitySlug(spaceTitle, spaceId, 'space'),
    ...(noteId ? { noteSlug: entitySlug(noteTitle, noteId, 'note') } : {}),
  };
}

export function isNotesRouteCanonical({
  spaceSlug,
  noteSlug,
  spaceTitle,
  spaceId,
  noteTitle,
  noteId,
}: {
  spaceSlug: string;
  noteSlug?: string;
  spaceTitle?: string;
  spaceId: string;
  noteTitle?: string;
  noteId?: string;
}) {
  const canonical = notesRouteParams(spaceTitle, spaceId, noteTitle, noteId);
  return canonical.spaceSlug === spaceSlug && (!noteId || canonical.noteSlug === noteSlug);
}
