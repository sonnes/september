import { eq } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';

import { chatCollection } from '../db';
import { Chat } from '../types';

export function useChats(userId?: string) {
  const { data: chats, isLoading } = useLiveQuery(
    q => {
      let query = q.from({ items: chatCollection });
      if (userId) {
        query = query.where(({ items }) => eq(items.user_id, userId));
      }
      return query.orderBy(({ items }) => items.created_at, 'desc');
    },
    [userId]
  );

  return {
    chats: (chats || []) as Chat[],
    isLoading,
    insert: (item: Chat) => chatCollection.insert(item),
    update: (id: string, updates: Partial<Chat>) =>
      chatCollection.update(id, draft => {
        Object.assign(draft, updates);
      }),
    delete: (id: string) => chatCollection.delete(id),
  };
}

export function useChat(id: string) {
  const {
    data: chat,
    isLoading,
    status,
  } = useLiveQuery(
    q => q.from({ items: chatCollection }).where(({ items }) => eq(items.id, id)),
    [id]
  );

  return {
    chat: chat?.[0] as Chat | undefined,
    isLoading,
    status,
    update: (updates: Partial<Chat>) =>
      chatCollection.update(id, draft => {
        Object.assign(draft, updates);
      }),
    delete: () => chatCollection.delete(id),
  };
}
