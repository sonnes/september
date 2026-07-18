'use client';

import { useMemo } from 'react';

import { entitySlug, idFromSlug } from '@/packages/shared';

import { Space } from '../types';
import { useSpaces } from './use-spaces';

/**
 * Resolve an id-free space slug (e.g. "morning-notes") to its space id by
 * matching against the loaded spaces. Falls back to a legacy UUID suffix so old
 * `…-<uuid>` links still resolve. Pure — testable without React.
 */
export function spaceIdFromSlug(slug: string, spaces: Space[]): string | undefined {
  const byTitle = spaces.find(space => entitySlug(space.title, 'space') === slug);
  if (byTitle) return byTitle.id;

  const legacyId = idFromSlug(slug);
  return spaces.find(space => space.id === legacyId)?.id;
}

export interface UseSpaceIdFromSlugReturn {
  spaceId: string | undefined;
  isLoading: boolean;
}

/** Reactive slug → space-id resolution; `spaceId` is undefined until matched. */
export function useSpaceIdFromSlug(slug: string): UseSpaceIdFromSlugReturn {
  const { spaces, isLoading } = useSpaces();
  const spaceId = useMemo(() => spaceIdFromSlug(slug, spaces), [slug, spaces]);
  return { spaceId, isLoading };
}
