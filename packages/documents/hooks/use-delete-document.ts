'use client';

import { useCallback, useState } from 'react';

import { documentCollection } from '../db';

export interface UseDeleteDocumentReturn {
  deleteDocument: (id: string) => Promise<void>;
  isDeleting: boolean;
  error?: string;
}

export function useDeleteDocument(): UseDeleteDocumentReturn {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string>();

  const deleteDocument = useCallback(async (id: string) => {
    setIsDeleting(true);
    setError(undefined);
    try {
      await documentCollection.delete(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete document';
      setError(message);
      console.error('Failed to delete document:', err);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteDocument, isDeleting, error };
}
