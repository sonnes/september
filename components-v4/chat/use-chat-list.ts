import { useQuery } from '@triplit/react';

import { useAccount } from '@/components-v4/account';
import { triplit } from '@/triplit/client';
import { Chat } from '@/types/chat';

export default function useChatList({ searchQuery }: { searchQuery?: string }) {
  const { user } = useAccount();

  const query = triplit
    .query('chats')
    .Where('user_id', '=', user?.id || '')
    .Order('created_at', 'DESC')
    .Limit(100);

  if (searchQuery) {
    query.Where('title', 'like', `%${searchQuery}%`);
  }

  const { results, fetching, error } = useQuery(triplit, query);

  const createChat = async () => {
    if (!user?.id) {
      throw new Error('User not found');
    }
    const chat = await triplit.insert('chats', {
      user_id: user.id,
    });
    return chat;
  };

  return {
    chats:
      (results?.map(chat => ({
        id: chat.id,
        user_id: chat.user_id,
        title: chat.title ?? undefined,
        created_at: chat.created_at,
        updated_at: chat.updated_at,
      })) as Chat[]) || [],
    fetching,
    error,
    createChat,
  };
}
