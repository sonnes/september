import { useCallback, useEffect, useState } from 'react';

import { toast } from 'sonner';

import { useAccount } from '@/services/account/context';

import supabase from '@/supabase/client';
import { removeRealtimeSubscription, subscribeToUserMessages } from '@/supabase/realtime';
import { CreateMessageData, Message } from '@/types/message';

import { MessagesService } from './supabase';

const messagesService = new MessagesService(supabase);

export function useMessages({ messages: initialMessages }: { messages: Message[] }) {
  const { user } = useAccount();

  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const getMessages = useCallback(async () => {
    if (!user) return;

    try {
      const data = await messagesService.getMessages(user.id);

      setMessages(data.reverse());

      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch messages');
      console.error(error);
    }
  }, [user]);

  useEffect(() => {
    if (initialMessages.length === 0) {
      getMessages();
    }
  }, [user, initialMessages.length]);

  // Realtime subscription for messages
  useEffect(() => {
    if (!user) return;

    const channel = subscribeToUserMessages<Message>(user.id, {
      onInsert: newMessage => {
        setMessages(prev => [newMessage, ...prev]);
      },
      onUpdate: updatedMessage => {
        setMessages(prev => prev.map(msg => (msg.id === updatedMessage.id ? updatedMessage : msg)));
      },
      onDelete: deletedMessage => {
        setMessages(prev => prev.filter(msg => msg.id !== deletedMessage.id));
      },
      onError: error => {
        console.error('Messages realtime error:', error);
        toast.error('Failed to receive real-time updates');
      },
      onSubscribe: status => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to messages changes');
        }
      },
    });

    // Cleanup function to unsubscribe on unmount
    return () => {
      removeRealtimeSubscription(channel);
    };
  }, [user]);

  return {
    messages,
    getMessages,
  };
}

export function useCreateMessage() {
  const { user } = useAccount();

  const createMessage = useCallback(
    async (message: CreateMessageData) => {
      try {
        const createdMessage = await messagesService.createMessage(message);
        return createdMessage;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create message');
        console.error(error);
      }
    },
    [user]
  );

  return { createMessage };
}

export function useSearchMessages() {
  const { user } = useAccount();

  const searchMessages = useCallback(
    async (query: string) => {
      if (!user) return [];

      const data = await messagesService.searchMessages(user.id, query);
      return data as Message[];
    },
    [user]
  );

  return { searchMessages };
}
