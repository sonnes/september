'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { chatCollection } from '../db';
import type { Chat } from '../types';

export interface UseUpdateChatReturn {
  updateChat: (id: string, updates: Partial<Chat>) => Promise<void>;
  isUpdating: boolean;
}

export function useUpdateChat(): UseUpdateChatReturn {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateChat = useCallback(async (id: string, updates: Partial<Chat>) => {
    setIsUpdating(true);
    try {
      await chatCollection.update(id, draft => {
        Object.assign(draft, {
          ...updates,
          updated_at: new Date(),
        });
      });
    } catch (error) {
      console.error('Failed to update chat:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update chat');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return { updateChat, isUpdating };
}
