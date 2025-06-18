'use client';

import { createContext, useContext, useState } from 'react';

import type { Message } from '@/supabase/types';

type MessagesContext = {
  messages: Message[];
  addMessage: (message: Message) => void;
};

const MessagesContext = createContext<MessagesContext | undefined>(undefined);

export function MessagesProvider({
  messages: initialMessages,
  children,
}: {
  messages: Message[];
  children: React.ReactNode;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  return (
    <MessagesContext.Provider value={{ messages, addMessage }}>{children}</MessagesContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
}
