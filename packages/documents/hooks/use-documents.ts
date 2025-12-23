'use client';

import { useMemo } from 'react';

import { ilike } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';

import { documentCollection } from '../db';
import type { Document } from '../types';

export interface UseDocumentsReturn {
  documents: Document[];
  isLoading: boolean;
  error?: { message: string };
}

export function useDocuments({ searchQuery }: { searchQuery?: string } = {}): UseDocumentsReturn {
  const { data: documents, isLoading, isError, status } = useLiveQuery(
    q => {
      let query = q.from({ items: documentCollection });
      if (searchQuery) {
        query = query.where(({ items }) => ilike(items.name, `%${searchQuery}%`));
      }
      return query.orderBy(({ items }) => items.updated_at, 'desc');
    },
    [searchQuery]
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
