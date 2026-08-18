import { useMemo } from 'react';

import { useRecordListQuery } from '@/packages/shared/lib/data';

import { messageCollection } from '../db';
import { type Message, MessageSchema } from '../types';

export interface UseMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  error?: { message: string };
}

export function useMessages({
  spaceId,
  searchQuery,
  limit = 100,
}: {
  spaceId?: string;
  searchQuery?: string;
  limit?: number;
} = {}): UseMessagesReturn {
  const { data, isLoading, error } = useRecordListQuery(
    'messages',
    messageCollection,
    MessageSchema
  );
  const messages = useMemo(() => {
    const search = searchQuery?.toLowerCase();
    return data
      .filter(
        message =>
          (!spaceId || message.space_id === spaceId) &&
          (!search || message.text.toLowerCase().includes(search))
      )
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
      .slice(0, limit);
  }, [data, limit, searchQuery, spaceId]);

  return {
    messages,
    isLoading,
    error,
  };
}

export interface UseFirstMessageReturn {
  message: Message | undefined;
  isLoading: boolean;
  error?: { message: string };
}

export function useFirstMessage(spaceId?: string): UseFirstMessageReturn {
  const { messages, isLoading, error } = useMessages({ spaceId, limit: 1 });
  return {
    message: spaceId ? messages[0] : undefined,
    isLoading,
    error,
  };
}
