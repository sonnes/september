'use client';

import { Loader2 } from 'lucide-react';

import { cn, timeAgo } from '@/packages/shared';

import { usePlayMessage } from '../hooks/use-play-message';
import type { Message } from '../types';

interface MessageItemProps {
  message: Message;
}

function MessageItem({ message }: MessageItemProps) {
  const isUser = message.type === 'user';
  const { play, isLoading, isPlaying: isCurrentlyPlaying } = usePlayMessage(message);

  const handleClick = play;

  return (
    <div
      className={cn(
        'group flex w-full max-w-[95%] flex-col gap-2',
        isUser ? 'is-user ml-auto items-end' : 'is-assistant'
      )}
    >
      <div
        onClick={handleClick}
        className={cn(
          'relative flex w-fit max-w-full min-w-0 cursor-pointer flex-col gap-2 overflow-hidden text-sm transition-opacity hover:opacity-90',
          'group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground',
          'group-[.is-assistant]:text-foreground',
          isLoading && 'opacity-70'
        )}
        role="button"
        tabIndex={0}
        aria-label={isCurrentlyPlaying ? 'Pause message' : 'Play message'}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {isLoading && (
          <div className="absolute right-2 top-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        <p className="text-foreground wrap-break-word">{message.text}</p>
      </div>
      <p className={cn('text-xs text-muted-foreground', isUser ? 'text-right' : 'text-left')}>
        {timeAgo(message.created_at)}
      </p>
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Send your first message to set the context for this chat and auto-generate a custom keyboard
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {[...messages].reverse().map((message, index) => (
        <MessageItem key={message.id || index} message={message} />
      ))}
    </div>
  );
}
