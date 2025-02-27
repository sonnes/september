'use client';

import { useEffect, useRef } from 'react';

import { useMessages } from '@/components/context/messages';
import type { Message } from '@/supabase/types';

import { PlayButton } from './play-button';

function Message({ message }: { message: Message }) {
  return (
    <div
      className={`mb-4 p-3 bg-zinc-50 rounded-lg w-full ${
        message.type === 'transcription' ? 'bg-red-100' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>{message.text}</div>
        {message.type === 'message' && <PlayButton id={message.id} text={message.text} />}
      </div>
    </div>
  );
}

export function MessageList() {
  const { messages } = useMessages();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].type === 'message') {
      scrollToBottom();
    }
  }, [messages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    scrollToBottom();
  }, []);

  return (
    <>
      {messages.map((message, index) => (
        <Message key={index} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </>
  );
}
