import { useMemo } from 'react';

import { useQuery, useQueryOne } from '@triplit/react';

import { useAccount } from '@/components-v4/account';
import { triplit } from '@/triplit/client';
import { Message } from '@/types/message';

export default function useMessages({ chatId }: { chatId: string }) {
  const { user } = useAccount();

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

  const chat = useMemo(() => triplit.fetchById('chats', chatId), [chatId]);

  return {
    chat,
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
    fetching: fetching,
    error: error,
  };
}

export function useMessageHistory({ query, limit = 10 }: { query: string; limit?: number }) {
  const { user } = useAccount();

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
