'use client';

import { ReactNode, createContext, useContext } from 'react';

import type { Message } from '@/types/message';

import { useMessagesSupabase } from './use-supabase';
import { useMessagesTriplit } from './use-triplit';

interface MessagesContextType {
  messages: Message[];
  getMessages: () => Promise<Message[] | undefined>;
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

  return <MessagesContext.Provider value={messagesData}>{props.children}</MessagesContext.Provider>;
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
}
