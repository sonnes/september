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
