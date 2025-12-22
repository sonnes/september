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
  // Call all hooks unconditionally to satisfy React Hooks rules
  const supabaseMessages = useMessagesSupabase(
    props.provider === 'supabase' ? { messages: props.messages } : { messages: [] }
  );
  const triplitMessages = useMessagesTriplit();
  const supabaseCreate = useCreateMessageSupabase();
  const triplitCreate = useCreateMessageTriplit();
  const supabaseSearch = useSearchMessagesSupabase();
  const triplitSearch = useSearchMessagesTriplit();

  // Use the appropriate hooks based on provider
  const messagesData = props.provider === 'supabase' ? supabaseMessages : triplitMessages;
  const { createMessage } = props.provider === 'supabase' ? supabaseCreate : triplitCreate;
  const { searchMessages } = props.provider === 'supabase' ? supabaseSearch : triplitSearch;

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
