'use client';

import { useEffect, useRef } from 'react';

import clsx from 'clsx';

import { useMessages } from '@/components/context/messages';
import type { Message } from '@/supabase/types';

import { PlayButton } from './play-button';

function Message({ message }: { message: Message }) {
  const messageTypeStyles =
    {
      transcription: 'bg-blue-50 border border-blue-100',
      message: 'bg-white border border-gray-200',
    }[message.type] || 'bg-gray-50 border border-gray-100';

  return (
    <div className={`mb-4 p-4 rounded-lg w-full transition-colors ${messageTypeStyles}`}>
      <div className="flex items-center justify-between gap-4">
        <div
          className={clsx(
            message.type === 'transcription' ? 'text-blue-500' : 'text-gray-800',
            'font-medium'
          )}
        >
          {message.text}
        </div>
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
