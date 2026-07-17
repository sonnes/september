import { entitySlug } from '@/packages/shared';

export type SpaceMode = 'talk' | 'notes';

export function routeForSpaceMode(
  mode: SpaceMode
): '/spaces/$spaceSlug/talk' | '/spaces/$spaceSlug/notes' {
  return mode === 'notes' ? '/spaces/$spaceSlug/notes' : '/spaces/$spaceSlug/talk';
}

export function shouldShowSpaceSidePanel(_mode: SpaceMode, open: boolean): boolean {
  return open;
}

const MODE_STORAGE_PREFIX = 'september:space-mode:';

function isSpaceMode(value: unknown): value is SpaceMode {
  return value === 'talk' || value === 'notes';
}

/** The last mode this space was opened in — defaults to talk. */
export function lastSpaceMode(spaceId: string): SpaceMode {
  if (typeof window === 'undefined') return 'talk';
  try {
    const stored = localStorage.getItem(`${MODE_STORAGE_PREFIX}${spaceId}`);
    return isSpaceMode(stored) ? stored : 'talk';
  } catch {
    return 'talk';
  }
}

/** Remember the mode a space was last opened in. */
export function rememberSpaceMode(spaceId: string, mode: SpaceMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${MODE_STORAGE_PREFIX}${spaceId}`, mode);
  } catch {
    // private mode / quota — the choice just doesn't persist
  }
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
