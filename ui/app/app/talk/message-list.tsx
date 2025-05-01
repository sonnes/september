'use client';

import { useState } from 'react';

import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import moment from 'moment';

import { DialogTitle } from '@/components/catalyst/dialog';
import { DialogBody } from '@/components/catalyst/dialog';
import { Dialog } from '@/components/catalyst/dialog';
import { useMessages } from '@/components/context/messages';
import type { Message } from '@/supabase/types';

import { PlayButton } from './play-button';

function Message({ message }: { message: Message }) {
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
        {message.type === 'message' && <PlayButton id={message.id} text={message.text} />}
      </div>
    </div>
  );
}

export function MessageList() {
  const { messages } = useMessages();

  return (
    <>
      {[...messages].reverse().map((message, index) => (
        <Message key={index} message={message} />
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

      <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
        <div className="flex items-center justify-between py-4 border-b">
          <DialogTitle className="text-xl font-semibold pr-8">History</DialogTitle>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <DialogBody>
          <MessageList />
        </DialogBody>
      </Dialog>
    </div>
  );
}
