import { useQuery } from '@triplit/react';

import { useAccount } from '@/components-v4/account';
import { triplit } from '@/triplit/client';
import { Message } from '@/types/message';

export default function useMessages({ chatId }: { chatId: string }) {
  const { user } = useAccount();

  const query = triplit
    .query('messages')
    .Where('user_id', '=', user?.id || '')
    .Where('chat_id', '=', chatId)
    .Order('created_at', 'DESC')
    .Limit(100);

  const { results, fetching, error } = useQuery(triplit, query);

  return {
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
    fetching,
    error,
  };
}
