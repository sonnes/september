'use client';

import { useMemo } from 'react';

import { eq, ilike } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';

import { documentCollection } from '../db';
import type { Document } from '../types';

export interface UseDocumentsReturn {
  documents: Document[];
  isLoading: boolean;
  error?: { message: string };
}

export function useDocuments({
  searchQuery,
  spaceId,
}: { searchQuery?: string; spaceId?: string } = {}): UseDocumentsReturn {
  const {
    data: documents,
    isLoading,
    isError,
    status,
  } = useLiveQuery(
    q => {
      let query = q.from({ items: documentCollection });
      if (spaceId) {
        query = query.where(({ items }) => eq(items.space_id, spaceId));
      }
      if (searchQuery) {
        query = query.where(({ items }) => ilike(items.name, `%${searchQuery}%`));
      }
      return query.orderBy(({ items }) => items.updated_at, 'desc');
    },
    [searchQuery, spaceId]
  );

  const error = useMemo(
    () => (isError ? { message: `Database error: ${status}` } : undefined),
    [isError, status]
  );

  return {
    documents: (documents || []) as Document[],
    isLoading,
    error,
  };
}
