'use client';

import { useCallback, useState } from 'react';

import { toast } from 'sonner';

import { documentCollection } from '../db';

export interface UseDeleteDocumentReturn {
  deleteDocument: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export function useDeleteDocument(): UseDeleteDocumentReturn {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteDocument = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      await documentCollection.delete(id);
      toast.success('Document deleted');
    } catch (err) {
      console.error('Failed to delete document:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete document');
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteDocument, isDeleting };
}
