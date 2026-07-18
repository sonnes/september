import { entitySlug } from '@/packages/shared';

export type SpaceMode = 'talk' | 'notes';

export function routeForSpaceMode(
  mode: SpaceMode
): '/spaces/$spaceSlug/talk' | '/spaces/$spaceSlug/notes' {
  return mode === 'notes' ? '/spaces/$spaceSlug/notes' : '/spaces/$spaceSlug/talk';
}

const MODE_STORAGE_PREFIX = 'september:space-mode:';

function isSpaceMode(value: unknown): value is SpaceMode {
  return value === 'talk' || value === 'notes';
}

/**
 * The last mode this space was opened in — defaults to talk. Keyed by the URL
 * slug (not the id) so the `/spaces/$spaceSlug` redirect can decide the mode
 * without first resolving the slug to an id.
 */
export function lastSpaceMode(spaceSlug: string): SpaceMode {
  if (typeof window === 'undefined') return 'talk';
  try {
    const stored = localStorage.getItem(`${MODE_STORAGE_PREFIX}${spaceSlug}`);
    return isSpaceMode(stored) ? stored : 'talk';
  } catch {
    return 'talk';
  }
}

/** Remember the mode a space was last opened in, keyed by its URL slug. */
export function rememberSpaceMode(spaceSlug: string, mode: SpaceMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${MODE_STORAGE_PREFIX}${spaceSlug}`, mode);
  } catch {
    // private mode / quota — the choice just doesn't persist
  }
}

export function notesRouteParams(spaceTitle: string | undefined, noteTitle?: string) {
  return {
    spaceSlug: entitySlug(spaceTitle, 'space'),
    ...(noteTitle !== undefined ? { noteSlug: entitySlug(noteTitle, 'note') } : {}),
  };
}

export function isNotesRouteCanonical({
  spaceSlug,
  noteSlug,
  spaceTitle,
  noteTitle,
  hasNote,
}: {
  spaceSlug: string;
  noteSlug?: string;
  spaceTitle?: string;
  noteTitle?: string;
  hasNote?: boolean;
}) {
  const canonical = notesRouteParams(spaceTitle, hasNote ? (noteTitle ?? '') : undefined);
  return canonical.spaceSlug === spaceSlug && (!hasNote || canonical.noteSlug === noteSlug);
}
