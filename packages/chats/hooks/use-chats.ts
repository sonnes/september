import { useCallback, useMemo } from 'react';

import { eq } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';
import { v4 as uuidv4 } from 'uuid';

import { useAccountContext } from '@/packages/account';

import { chatCollection } from '../db';
import { Chat } from '../types';

export function useChats({ userId, searchQuery }: { userId?: string; searchQuery?: string } = {}) {
  const {
    data: chats,
    isLoading,
    isError,
    status,
  } = useLiveQuery(
    q => {
      let query = q.from({ items: chatCollection });
      if (userId) {
        query = query.where(({ items }) => eq(items.user_id, userId));
      }
      return query.orderBy(({ items }) => items.updated_at, 'desc');
    },
    [userId]
  );

  const filteredChats =
    searchQuery && chats
      ? chats.filter(chat => chat.title?.toLowerCase().includes(searchQuery.toLowerCase()))
      : chats;

  const error = useMemo(
    () => (isError ? { message: `Database error: ${status}` } : undefined),
    [isError, status]
  );

  return {
    chats: (filteredChats || []) as Chat[],
    isLoading,
    error,
  };
}

export function useCreateChat() {
  const { user } = useAccountContext();

  const createChat = useCallback(
    async (title: string = 'New Chat'): Promise<Chat> => {
      if (!user?.id) {
        throw new Error('User not found');
}

      const now = new Date();
      const newChat: Chat = {
        id: uuidv4(),
        user_id: user.id,
        title,
        created_at: now,
        updated_at: now,
      };

      chatCollection.insert(newChat);
      return newChat;
    },
    [user]
  );

  return { createChat };
}
