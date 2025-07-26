'use client';

import { useState } from 'react';

import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import moment from 'moment';

import { useMessagesContext } from '@/components/context/messages-provider';
import type { Message } from '@/types/message';

import { PlayButton } from './play-button';

function MessageItem({ message }: { message: Message }) {
  const messageTypeStyles =
    {
      transcription: 'bg-blue-50 border border-blue-100',
      message: 'bg-zinc-50 border border-zinc-100',
    }[message.type] || 'bg-zinc-50 border border-zinc-100';

  return (
    <div className={`mb-4 p-2 rounded-lg w-full max-w-full transition-colors ${messageTypeStyles}`}>
      <div className="flex items-center justify-between gap-4 min-w-0">
        <div className="flex-1 min-w-0">
          <div
            className={clsx(
              message.type === 'transcription' ? 'text-blue-500' : 'text-zinc-600',
              'font-medium break-words overflow-hidden'
            )}
          >
            {message.text}
          </div>
          <div className="text-xs text-zinc-400 mt-1">{moment(message.created_at).fromNow()}</div>
        </div>
        {message.audio_path && <PlayButton path={message.audio_path} />}
      </div>
    </div>
  );
}

export function MessageList() {
  const { messages } = useMessagesContext();

  return (
    <>
      {[...messages].reverse().map((message, index) => (
        <MessageItem key={index} message={message} />
      ))}
    </>
  );
}

export function MobileMessageList() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        className="p-2 text-white rounded-full transition-colors cursor-pointer"
        onClick={() => setIsOpen(prev => !prev)}
      >
        <ChatBubbleLeftRightIcon className="w-8 h-8" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
          <div className="bg-white w-full max-h-[80vh] rounded-t-lg overflow-hidden">
            <div className="flex items-center justify-between py-4 px-4 border-b">
              <h2 className="text-xl font-semibold">History</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Close"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              <MessageList />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
