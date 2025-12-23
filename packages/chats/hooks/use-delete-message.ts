'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { messageCollection } from '../db';

export interface UseDeleteMessageReturn {
  deleteMessage: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export function useDeleteMessage(): UseDeleteMessageReturn {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMessage = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      await messageCollection.delete(id);
      toast.success('Message deleted');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete message');
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteMessage, isDeleting };
}
