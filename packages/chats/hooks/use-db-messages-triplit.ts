'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useQuery, useQueryOne } from '@triplit/react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { useAccountContext } from '@/packages/account';
import { triplit } from '@/triplit/client';
import { Chat } from '../types/chat';
import { CreateMessageData, Message } from '../types/message';

// Hook for messages within a specific chat
export function useChatMessages({ chatId }: { chatId: string }) {
  const { user } = useAccountContext();

  const messagesQuery = useMemo(
    () =>
      triplit
        .query('messages')
        .Where('user_id', '=', user?.id || '')
        .Where('chat_id', '=', chatId)
        .Order('created_at', 'DESC')
        .Limit(100),
    [user?.id, chatId]
  );

  const { results, fetching, error } = useQuery(triplit, messagesQuery);

  const {
    result: chat,
    fetching: chatFetching,
    error: chatError,
  } = useQueryOne(triplit, triplit.query('chats').Where('id', '=', chatId));

  return {
    chat: chat as Chat | undefined,
    messages:
      (results?.map(message => ({
        id: message.id,
        text: message.text,
        type: message.type,
        user_id: message.user_id,
        audio_path: message.audio_path || undefined,
        chat_id: message.chat_id || undefined,
        created_at: message.created_at,
      })) as Message[]) || [],
    fetching: fetching || chatFetching,
    error: error || chatError,
  };
}

// Global messages hook (equivalent to services/messages/use-triplit.tsx)
export function useMessagesTriplit() {
  const { user } = useAccountContext();
  const [messages, setMessages] = useState<Message[]>([]);

  const query = triplit
    .query('messages')
    .Where('user_id', '=', user?.id || '')
    .Order('created_at', 'DESC')
    .Limit(100);

  const { results, fetching, error } = useQuery(triplit, query);

  useEffect(() => {
    if (!fetching && results) {
      setMessages(
        results.map(item => ({
          id: item.id,
          text: item.text,
          type: item.type,
          user_id: item.user_id,
          created_at: item.created_at,
          audio_path: item.audio_path || undefined,
          chat_id: item.chat_id || undefined,
        }))
      );
    } else if (error) {
      toast.error(error.message);
      console.error(error);
    }
  }, [fetching, results, error]);

  const getMessages = useCallback(async () => {
    return messages;
  }, [messages]);

  return {
    messages,
    getMessages,
  };
}

export function useCreateMessageTriplit() {
  const { user } = useAccountContext();

  const createMessage = useCallback(
    async (message: CreateMessageData): Promise<Message | undefined> => {
      if (!message.id) {
        message.id = uuidv4();
      }

      await triplit.insert('messages', {
        id: message.id,
        text: message.text,
        type: message.type,
        user_id: message.user_id,
        audio_path: message.audio_path,
        chat_id: message.chat_id,
        created_at: new Date(),
      });

      const result = await triplit.fetchById('messages', message.id);
      return result as Message | undefined;
    },
    [user]
  );

  return { createMessage };
}

export function useSearchMessagesTriplit() {
  const { user } = useAccountContext();

  const searchMessages = useCallback(
    async (query: string) => {
      if (!user) return [];

      const q = triplit
        .query('messages')
        .Where('user_id', '=', user.id)
        .Where('text', 'like', `%${query.trim().toLowerCase()}%`)
        .Order('created_at', 'DESC')
        .Limit(10);

      const result = await triplit.fetch(q);
      return result.map(item => ({
        id: item.id,
        text: item.text,
        type: item.type,
        user_id: item.user_id,
        created_at: item.created_at,
        audio_path: item.audio_path || undefined,
        chat_id: item.chat_id || undefined,
      })) as Message[];
    },
    [user]
  );

  return { searchMessages };
}

export function useMessageHistory({ query, limit = 10 }: { query: string; limit?: number }) {
  const { user } = useAccountContext();

  const trimmedQuery = query.trim();
  const isEmpty = trimmedQuery === '';

  const messagesQuery = useMemo(
    () =>
      isEmpty
        ? null
        : triplit
            .query('messages')
            .Where('user_id', '=', user?.id || '')
            .Where('text', 'like', `%${trimmedQuery.toLowerCase()}%`)
            .Order('created_at', 'DESC')
            .Limit(limit),
    [user?.id, trimmedQuery, limit]
  );

  const { results, fetching, error } = useQuery(
    triplit,
    messagesQuery || triplit.query('messages').Limit(0)
  );

  return {
    messages: isEmpty
      ? []
      : (results?.map(message => ({
          id: message.id,
          text: message.text,
          type: message.type,
          user_id: message.user_id,
          audio_path: message.audio_path || undefined,
          chat_id: message.chat_id || undefined,
          created_at: message.created_at,
        })) as Message[]) || [],
    fetching: isEmpty ? false : fetching,
    error: isEmpty ? undefined : error,
  };
}
