'use client';

import { useCallback, useState } from 'react';

import { toast } from 'sonner';

import { documentCollection } from '../db';
import type { UpdateDocumentData } from '../types';

export interface UseUpdateDocumentReturn {
  updateDocument: (id: string, updates: UpdateDocumentData) => Promise<void>;
  isUpdating: boolean;
}

export function useUpdateDocument(): UseUpdateDocumentReturn {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateDocument = useCallback(async (id: string, updates: UpdateDocumentData) => {
    setIsUpdating(true);
    try {
      await documentCollection.update(id, draft => {
        Object.assign(draft, {
          ...updates,
          updated_at: new Date(),
        });
      });
      toast.success('Document updated');
    } catch (err) {
      console.error('Failed to update document:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update document');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return { updateDocument, isUpdating };
}
