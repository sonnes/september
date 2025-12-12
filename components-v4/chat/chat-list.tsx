import Link from 'next/link';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { TextInput } from '@/components/uix/text-input';

type Chat = {
  id: string;
  title: string;
  lastMessageTime: string;
};

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
        <TextInput
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
        {chats.map(chat => (
          <Link key={chat.id} href={`/chats/${chat.id}`}>
            <div className="py-3 border-b border-zinc-200 hover:bg-zinc-50 transition-colors">
              <div className="text-base font-medium text-zinc-900 mb-1">{chat.title}</div>
              <div className="text-sm text-zinc-500">Last message {chat.lastMessageTime}</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
