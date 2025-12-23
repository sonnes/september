'use client';

import { useCallback, useState } from 'react';

import { documentCollection } from '../db';
import type { Document } from '../types';

export interface UseUpdateDocumentReturn {
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  isUpdating: boolean;
  error?: string;
}

export function useUpdateDocument(): UseUpdateDocumentReturn {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>();

  const updateDocument = useCallback(async (id: string, updates: Partial<Document>) => {
    setIsUpdating(true);
    setError(undefined);
    try {
      await documentCollection.update(id, draft => {
        Object.assign(draft, {
          ...updates,
          updated_at: new Date(),
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update document';
      setError(message);
      console.error('Failed to update document:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return { updateDocument, isUpdating, error };
}
