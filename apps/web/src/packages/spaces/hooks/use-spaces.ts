import { useMemo } from 'react';

import { eq } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';

import { spaceCollection } from '../db';
import { Space } from '../types';

export interface UseSpacesReturn {
  spaces: Space[];
  isLoading: boolean;
  error?: { message: string };
}

export function useSpaces({
  userId,
  searchQuery,
}: { userId?: string; searchQuery?: string } = {}): UseSpacesReturn {
  const {
    data: spaces,
    isLoading,
    isError,
    status,
  } = useLiveQuery(
    q => {
      let query = q.from({ items: spaceCollection });
      if (userId) {
        query = query.where(({ items }) => eq(items.user_id, userId));
      }
      return query.orderBy(({ items }) => items.updated_at, 'desc');
    },
    [userId]
  );

  const filteredSpaces =
    searchQuery && spaces
      ? spaces.filter(space => space.title?.toLowerCase().includes(searchQuery.toLowerCase()))
      : spaces;

  const error = useMemo(
    () => (isError ? { message: `Database error: ${status}` } : undefined),
    [isError, status]
  );

  return {
    spaces: (filteredSpaces || []) as Space[],
    isLoading,
    error,
  };
}
