import { useCallback, useEffect, useState } from 'react';

import { toast } from 'sonner';

import { useAccount } from '@/services/account/context';
import supabase from '@/supabase/client';
import { removeRealtimeSubscription, subscribeToUserMessages } from '@/supabase/realtime';
import { Message } from '../types/message';

export function useMessages({ messages: initialMessages }: { messages: Message[] }) {
  const { user } = useAccount();
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const getMessages = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      toast.error(error.message);
      console.error(error);
      return;
    }

    setMessages(data.reverse());
    return data;
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
