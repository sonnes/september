import { useMemo } from 'react';

import { eq, ilike } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';

import { messageCollection } from '../db';
import { Message } from '../types';

export function useMessages({
  chatId,
  searchQuery,
  limit = 100,
}: {
  chatId?: string;
  searchQuery?: string;
  limit?: number;
} = {}) {
  const {
    data: messages,
    isLoading,
    isError,
    status,
  } = useLiveQuery(
    q => {
      let query = q.from({ items: messageCollection });
      if (chatId) {
        query = query.where(({ items }) => eq(items.chat_id, chatId));
      }
      if (searchQuery && searchQuery.length > 0) {
        query = query.where(({ items }) => ilike(items.text, `%${searchQuery}%`));
      }
      return query.orderBy(({ items }) => items.created_at, 'asc').limit(limit);
    },
    [chatId, searchQuery]
  );

  const error = useMemo(
    () => (isError ? { message: `Database error: ${status}` } : undefined),
    [isError, status]
  );

  return {
    messages: (messages || []) as Message[],
    isLoading,
    error,
  };
}

export function useFirstMessage(chatId?: string) {
  const {
    data: message,
    isLoading,
    isError,
    status,
  } = useLiveQuery(
    q => {
      let query = q
        .from({ items: messageCollection })
        .where(({ items }) => eq(items.chat_id, chatId))
        .orderBy(({ items }) => items.created_at, 'asc')
        .limit(1);
      return query;
    },
    [chatId]
  );
  return {
    message: message?.[0],
    isLoading,
    error: isError ? { message: `Database error: ${status}` } : undefined,
  };
}
