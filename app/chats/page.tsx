'use client';

import {
  ChatHeader,
  ChatListContainer,
  ChatListInfo,
  ChatListItem,
  ChatSearchBar,
} from '@/components-v4/chat';

export default function ChatsPage() {
  // TODO: Replace with actual data fetching
  const chats = [
    {
      id: '1',
      title: 'Importing used electric wheelchairs to India',
      lastMessageTime: '1 day ago',
    },
    {
      id: '2',
      title: 'Deferring symposium participation for product refinement',
      lastMessageTime: '4 days ago',
    },
    { id: '3', title: 'Sample chat', lastMessageTime: '1 month ago' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <ChatHeader onNewChat={() => console.log('New chat clicked')} />
      <ChatSearchBar onChange={value => console.log('Search:', value)} />
      <ChatListInfo count={55} label="chats" />
      <ChatListContainer>
        {chats.map(chat => (
          <ChatListItem
            key={chat.id}
            title={chat.title}
            lastMessageTime={chat.lastMessageTime}
            onClick={() => console.log('Chat clicked:', chat.id)}
          />
        ))}
      </ChatListContainer>
    </div>
  );
}
