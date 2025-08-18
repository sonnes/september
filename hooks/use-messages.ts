import { useCallback, useEffect, useState } from 'react';

import { User } from '@supabase/supabase-js';

import supabase from '@/supabase/client';
import { removeRealtimeSubscription, subscribeToUserMessages } from '@/supabase/realtime';
import { Message } from '@/types/message';

import { useToast } from './use-toast';

export function useMessages({
  user,
  messages: initialMessages,
}: {
  user: User;
  messages: Message[];
}) {
  const { showError } = useToast();
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const getMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      showError(error.message);
      console.error(error);
      return;
    }

    setMessages(data.reverse());
    return data;
  }, [user.id, showError]);

  useEffect(() => {
    if (initialMessages.length === 0) {
      getMessages();
    }
  }, [user.id, initialMessages.length]);

  // Realtime subscription for messages
  useEffect(() => {
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
        showError('Failed to receive real-time updates');
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
  }, [user.id, showError]);

  return {
    messages,
    getMessages,
  };
}
