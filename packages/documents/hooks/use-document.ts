'use client';

import { useMemo } from 'react';

import { eq } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';

import { documentCollection } from '../db';
import type { Document } from '../types';

export interface UseDocumentReturn {
  document: Document | undefined;
  isLoading: boolean;
  error?: { message: string };
}

export function useDocument(id?: string): UseDocumentReturn {
  const { data, isLoading, isError, status } = useLiveQuery(
    q => {
      let query = q.from({ items: documentCollection });
      if (id) {
        query = query.where(({ items }) => eq(items.id, id));
      }
      return query;
    },
    [id]
  );

  const error = useMemo(
    () => (isError ? { message: `Database error: ${status}` } : undefined),
    [isError, status]
  );

  return {
    document: data?.[0],
    isLoading,
    error,
  };
}
