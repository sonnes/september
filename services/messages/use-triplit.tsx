import { useCallback, useEffect, useState } from 'react';

import { useQuery } from '@triplit/react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { useAccount } from '@/services/account/context';

import { triplit } from '@/triplit/client';
import { CreateMessageData, Message } from '@/types/message';

export function useMessages() {
  const { user } = useAccount();

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
        }))
      );
    } else if (error) {
      toast.error(error.message);
      console.error(error);
    }
  }, [fetching, results]);

  const getMessages = useCallback(async () => {
    return messages;
  }, [messages]);

  return {
    messages,
    getMessages,
  };
}

export function useCreateMessage() {
  const { user } = useAccount();

  const createMessage = useCallback(
    async (message: CreateMessageData): Promise<Message | undefined> => {
      if (!message.id) {
        message.id = uuidv4();
      }

      await triplit.insert('messages', {
        id: message.id || uuidv4(),
        text: message.text,
        type: message.type,
        user_id: message.user_id,
        audio_path: message.audio_path,
        created_at: new Date(),
      });

      const result = await triplit.fetchById('messages', message.id);

      if (!result) {
        return undefined;
      }

      return result as Message;
    },
    [user]
  );

  return { createMessage };
}

export function useSearchMessages() {
  const { user } = useAccount();

  const searchMessages = useCallback(
    async (query: string) => {
      if (!user) return [];

      const q = await triplit
        .query('messages')
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
      })) as Message[];
    },
    [user]
  );

  return { searchMessages };
}
