import { useQuery, useQueryOne } from '@triplit/react';

import { useAccount } from '@/components-v4/account';
import { triplit } from '@/triplit/client';
import { Message } from '@/types/message';

export default function useMessages({ chatId }: { chatId: string }) {
  const { user } = useAccount();

  const messagesQuery = triplit
    .query('messages')
    .Where('user_id', '=', user?.id || '')
    .Where('chat_id', '=', chatId)
    .Order('created_at', 'DESC')
    .Limit(100);

  const { results, fetching, error } = useQuery(triplit, messagesQuery);

  const chatQuery = triplit
    .query('chats')
    .Where('user_id', '=', user?.id || '')
    .Where('id', '=', chatId)
    .Limit(1);

  const {
    result: chatResult,
    fetching: chatFetching,
    error: chatError,
  } = useQueryOne(triplit, chatQuery);

  return {
    chat: chatResult,
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

export function useMessageHistory({ query }: { query: string }) {
  const { user } = useAccount();

  const trimmedQuery = query.trim();
  const isEmpty = trimmedQuery === '';

  const messagesQuery = isEmpty
    ? null
    : triplit
        .query('messages')
        .Where('user_id', '=', user?.id || '')
        .Where('text', 'like', `%${trimmedQuery.toLowerCase()}%`)
        .Order('created_at', 'DESC')
        .Limit(10);

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
