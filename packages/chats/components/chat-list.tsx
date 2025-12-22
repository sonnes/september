import type { ComponentProps } from 'react';

import Link from 'next/link';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import moment from 'moment';

import { Input } from '@/components/ui/input';

import { cn } from '@/lib/utils';
import { Chat } from '../types/chat';

type ChatListEmptyStateProps = ComponentProps<'div'> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

function ChatListEmptyState({
  className,
  title = 'No chats yet',
  description = 'Start a new conversation to see your chats here',
  icon,
  children,
  ...props
}: ChatListEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex size-full flex-col items-center justify-center gap-3 p-8 text-center',
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          {icon && <div className="text-zinc-400">{icon}</div>}
          <div className="space-y-1">
            <h3 className="font-medium text-sm text-zinc-900">{title}</h3>
            {description && <p className="text-zinc-500 text-sm">{description}</p>}
          </div>
        </>
      )}
    </div>
  );
}

type ChatListProps = {
  chats: Chat[];
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  count?: number;
  label?: string;
};

export function ChatList({
  chats,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search your chats...',
  count,
  label = 'chats',
}: ChatListProps) {
  const displayText = count !== undefined ? `${count} ${label}` : undefined;

  return (
    <>
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-zinc-400" />
        </div>
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={e => onSearchChange?.(e.target.value)}
          className="pl-10"
        />
      </div>

      {displayText && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-zinc-600">{displayText}</span>
        </div>
      )}

      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {chats.length === 0 ? (
          <ChatListEmptyState
            title={searchValue ? 'No chats found' : 'No chats yet'}
            description={
              searchValue
                ? 'Try adjusting your search terms'
                : 'Start a new conversation to see your chats here'
            }
          />
        ) : (
          chats.map(chat => (
            <Link key={chat.id} href={`/chats/${chat.id}`}>
              <div className="py-3 border-b border-zinc-200 hover:bg-zinc-50 transition-colors">
                <div className="text-base font-medium text-zinc-900 mb-1">
                  {chat.title || 'Untitled chat'}
                </div>
                <div className="text-sm text-zinc-500">
                  Last message {moment(chat.updated_at).fromNow()}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
