'use client';

import { useCallback, useState } from 'react';

import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { useAccountContext } from '@/packages/account';

import { chatCollection } from '../db';
import { Chat } from '../types';

export interface UseCreateChatReturn {
  createChat: (title?: string) => Promise<Chat>;
  isCreating: boolean;
}

export function useCreateChat(): UseCreateChatReturn {
  const { user } = useAccountContext();
  const [isCreating, setIsCreating] = useState(false);

  const createChat = useCallback(
    async (title: string = 'New Chat'): Promise<Chat> => {
      if (!user?.id) {
        throw new Error('User not found');
      }

      setIsCreating(true);
      try {
        const now = new Date();
        const newChat: Chat = {
          id: uuidv4(),
          user_id: user.id,
          title,
          created_at: now,
          updated_at: now,
        };

        await chatCollection.insert(newChat);
        toast.success('Chat created');
        return newChat;
      } catch (err) {
        console.error('Failed to create chat:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to create chat');
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [user]
  );

  return { createChat, isCreating };
}
