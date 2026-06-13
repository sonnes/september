import { useMemo } from 'react';

import { eq } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';

import { chatCollection } from '../db';
import { Chat } from '../types';

export interface UseChatsReturn {
  chats: Chat[];
  isLoading: boolean;
  error?: { message: string };
}

export function useChats({
  userId,
  searchQuery,
}: { userId?: string; searchQuery?: string } = {}): UseChatsReturn {
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
