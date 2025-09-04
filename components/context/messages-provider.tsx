'use client';

import { ReactNode, createContext, useContext } from 'react';

import { User } from '@supabase/supabase-js';

import { useMessages } from '@/hooks/use-messages';
import type { Message } from '@/types/message';

interface MessagesContextType {
  messages: Message[];
  getMessages: () => Promise<Message[] | undefined>;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

interface MessagesProviderProps {
  messages: Message[];
  children: ReactNode;
}

export function MessagesProvider({ messages, children }: MessagesProviderProps) {
  const messagesData = useMessages({ messages });

  return <MessagesContext.Provider value={messagesData}>{children}</MessagesContext.Provider>;
}

export function useMessagesContext() {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessagesContext must be used within a MessagesProvider');
  }
  return context;
}
