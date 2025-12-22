'use client';

import { ReactNode, createContext, useContext } from 'react';

import type { CreateMessageData, Message } from '@/packages/chats';

import {
  useCreateMessage as useCreateMessageSupabase,
  useMessages as useMessagesSupabase,
  useSearchMessages as useSearchMessagesSupabase,
} from './use-supabase';
import {
  useCreateMessage as useCreateMessageTriplit,
  useMessages as useMessagesTriplit,
  useSearchMessages as useSearchMessagesTriplit,
} from './use-triplit';

interface MessagesContextType {
  messages: Message[];
  getMessages: () => Promise<Message[] | undefined>;
  createMessage: (message: CreateMessageData) => Promise<Message | undefined>;
  searchMessages: (query: string) => Promise<Message[]>;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

type MessagesProviderProps =
  | {
      provider: 'supabase';
      messages: Message[];
      children: ReactNode;
    }
  | {
      provider: 'triplit';
      children: ReactNode;
    };

export function MessagesProvider(props: MessagesProviderProps) {
  const messagesData =
    props.provider === 'supabase'
      ? useMessagesSupabase({ messages: props.messages })
      : useMessagesTriplit();

  const { createMessage } =
    props.provider === 'supabase' ? useCreateMessageSupabase() : useCreateMessageTriplit();

  const { searchMessages } =
    props.provider === 'supabase' ? useSearchMessagesSupabase() : useSearchMessagesTriplit();

  return (
    <MessagesContext.Provider value={{ ...messagesData, createMessage, searchMessages }}>
      {props.children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
}
