'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { chatCollection } from '../db';

export interface UseDeleteChatReturn {
  deleteChat: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export function useDeleteChat(): UseDeleteChatReturn {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteChat = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      await chatCollection.delete(id);
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Failed to delete chat:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete chat');
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteChat, isDeleting };
}
