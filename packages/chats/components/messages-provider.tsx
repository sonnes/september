'use client';

import { ReactNode, createContext, useCallback, useContext } from 'react';

import { messageCollection } from '../db';
import { useCreateMessage } from '../hooks/use-create-message';
import { useDbMessages, useSearchMessages } from '../hooks/use-db-messages';
import { CreateMessageData, Message } from '../types';

interface MessagesContextType {
  messages: Message[];
  getMessages: () => Promise<Message[] | undefined>;
  createMessage: (message: CreateMessageData) => Promise<Message | undefined>;
  searchMessages: (query: string) => Promise<Message[]>;
}

export const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

interface MessagesProviderProps {
  children: ReactNode;
  chatId?: string;
}

export function MessagesProvider({ children, chatId }: MessagesProviderProps) {
  const { messages } = useDbMessages(chatId);
  const { createMessage: createMsg } = useCreateMessage();

  const getMessages = useCallback(async () => {
    return messages;
  }, [messages]);

  const createMessage = useCallback(
    async (data: CreateMessageData) => {
      return await createMsg(data);
    },
    [createMsg]
  );

  const searchMessages = useCallback(async (query: string) => {
    if (!query) return [];
    // For now, doing a simple in-memory search from the collection
    // In a real app, this might be a specialized query
    return messageCollection.utils
      .getAll()
      .filter((m: Message) => m.text.toLowerCase().includes(query.toLowerCase()));
  }, []);

  return (
    <MessagesContext.Provider value={{ messages, getMessages, createMessage, searchMessages }}>
      {children}
    </MessagesContext.Provider>
  );
}
