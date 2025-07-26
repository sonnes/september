import { useCallback, useEffect, useState } from 'react';

import { User } from '@supabase/supabase-js';

import supabase from '@/supabase/client';
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
    const { data, error } = await supabase.from('messages').select('*').eq('user_id', user.id);

    if (error) {
      showError(error.message);
      console.error(error);
      return;
    }

    setMessages(data);
    return data;
  }, [user.id]);

  useEffect(() => {
    if (initialMessages.length === 0) {
      getMessages();
    }
  }, [user.id, initialMessages.length]);

  return {
    messages,
    getMessages,
  };
}
