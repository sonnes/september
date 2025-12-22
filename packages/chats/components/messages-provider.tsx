'use client';

import { ReactNode, createContext, useContext } from 'react';

import { CreateMessageData, Message } from '../types/message';
import {
  useCreateMessageSupabase,
  useMessagesSupabase,
  useSearchMessagesSupabase,
} from '../hooks/use-db-messages-supabase';
import {
  useCreateMessageTriplit,
  useMessagesTriplit,
  useSearchMessagesTriplit,
} from '../hooks/use-db-messages-triplit';

interface MessagesContextType {
  messages: Message[];
  getMessages: () => Promise<Message[] | undefined>;
  createMessage: (message: CreateMessageData) => Promise<Message | undefined>;
  searchMessages: (query: string) => Promise<Message[]>;
}

export const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

type MessagesProviderProps =
  | {
      provider: 'supabase';
      messages: Message[];
      children: ReactNode;
    }
  | {
      provider?: 'triplit';
      messages?: Message[];
      children: ReactNode;
    };

export function MessagesProvider(props: MessagesProviderProps) {
  const provider = props.provider || 'triplit';
  const isSupabase = provider === 'supabase';

  const supabaseMessages = useMessagesSupabase(
    isSupabase ? { messages: props.messages || [] } : { messages: [] }
  );
  const triplitMessages = useMessagesTriplit();

  const supabaseCreate = useCreateMessageSupabase();
  const triplitCreate = useCreateMessageTriplit();

  const supabaseSearch = useSearchMessagesSupabase();
  const triplitSearch = useSearchMessagesTriplit();

  const messagesData = isSupabase ? supabaseMessages : triplitMessages;
  const { createMessage } = isSupabase ? supabaseCreate : triplitCreate;
  const { searchMessages } = isSupabase ? supabaseSearch : triplitSearch;

  return (
    <MessagesContext.Provider value={{ ...messagesData, createMessage, searchMessages }}>
      {props.children}
    </MessagesContext.Provider>
  );
}

