import { useCallback } from 'react';

import { v4 as uuidv4 } from 'uuid';

import { useAccountContext } from '@/packages/account';

import { chatCollection } from '../db';
import { Chat } from '../types';
import { useChats } from './use-chats';

export default function useChatList({ searchQuery }: { searchQuery?: string } = {}) {
  const { user } = useAccountContext();
  const { chats, isLoading } = useChats(user?.id);

  const filteredChats = searchQuery
    ? chats.filter(chat => chat.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : chats;

  const createChat = useCallback(async (): Promise<Chat> => {
    if (!user?.id) {
      throw new Error('User not found');
    }

    const now = new Date();
    const newChat: Chat = {
      id: uuidv4(),
      user_id: user.id,
      title: 'New Chat',
      created_at: now,
      updated_at: now,
    };

    chatCollection.insert(newChat);
    return newChat;
  }, [user]);

  return {
    chats: filteredChats,
    fetching: isLoading,
    error: undefined,
    createChat,
  };
}
