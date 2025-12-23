import { eq } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';

import { messageCollection } from '../db';
import { Message } from '../types';
import { useChat } from './use-chats';

export function useDbMessages(chatId?: string) {
  const {
    data: messages,
    isLoading,
    status,
  } = useLiveQuery(
    q => {
      let query = q.from({ items: messageCollection });
      if (chatId) {
        query = query.where(({ items }) => eq(items.chat_id, chatId));
      }
      return query.orderBy(({ items }) => items.created_at, 'desc');
    },
    [chatId]
  );

  return {
    messages: (messages || []) as Message[],
    isLoading,
    status,
    insert: (item: Message) => messageCollection.insert(item),
    delete: (id: string) => messageCollection.delete(id),
  };
}

export function useSearchMessages(queryText: string) {
  const { data: messages, isLoading } = useLiveQuery(q => {
    return q.from({ items: messageCollection }).orderBy(({ items }) => items.created_at, 'desc');
  }, []);

  const filteredMessages = queryText
    ? (messages || []).filter(m => m.text.toLowerCase().includes(queryText.toLowerCase()))
    : messages || [];

  return {
    messages: filteredMessages.slice(0, 10) as Message[],
    isLoading,
  };
}

export function useMessageHistory({ query, limit = 10 }: { query: string; limit?: number }) {
  const { messages, isLoading } = useSearchMessages(query);

  return {
    messages: messages.slice(0, limit),
    fetching: isLoading,
  };
}

export function useChatMessages({ chatId }: { chatId: string }) {
  const { chat, isLoading: chatLoading, status: chatStatus } = useChat(chatId);
  const { messages, isLoading: messagesLoading, status: messagesStatus } = useDbMessages(chatId);

  return {
    chat,
    messages,
    isLoading: chatLoading || messagesLoading,
    error: chatStatus || messagesStatus,
  };
}
