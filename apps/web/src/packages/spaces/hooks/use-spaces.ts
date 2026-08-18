import { useMemo } from 'react';

import { useRecordListQuery } from '@/packages/shared/lib/data';

import { spaceCollection } from '../db';
import { type Space, SpaceSchema } from '../types';

export interface UseSpacesReturn {
  spaces: Space[];
  isLoading: boolean;
  error?: { message: string };
}

export function useSpaces({
  userId,
  searchQuery,
}: { userId?: string; searchQuery?: string } = {}): UseSpacesReturn {
  const { data, isLoading, error } = useRecordListQuery('spaces', spaceCollection, SpaceSchema);
  const spaces = useMemo(() => {
    const search = searchQuery?.toLowerCase();
    return data
      .filter(
        space =>
          (!userId || space.user_id === userId) &&
          (!search || space.title?.toLowerCase().includes(search))
      )
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  }, [data, searchQuery, userId]);

  return {
    spaces,
    isLoading,
    error,
  };
}
