'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { customKeyboardCollection } from '../db';

export interface UseDeleteKeyboardReturn {
  deleteKeyboard: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export function useDeleteKeyboard(): UseDeleteKeyboardReturn {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteKeyboard = useCallback(
    async (id: string) => {
      setIsDeleting(true);
      try {
        await customKeyboardCollection.delete(id);
        toast.success('Keyboard deleted');
      } catch (err) {
        console.error('Failed to delete keyboard:', err);
        toast.error('Failed to delete keyboard');
        throw err;
      } finally {
        setIsDeleting(false);
      }
    },
    []
  );

  return { deleteKeyboard, isDeleting };
}
