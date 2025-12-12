'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { PlusIcon } from '@heroicons/react/24/outline';
import moment from 'moment';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { useToast } from '@/hooks/use-toast';

import { ChatList } from '@/components-v4/chat/chat-list';
import useChatList from '@/components-v4/chat/use-chat-list';
import SidebarLayout from '@/components-v4/sidebar/layout';

export default function ChatsPage() {
  const router = useRouter();
  const { showError } = useToast();
  const [searchValue, setSearchValue] = useState('');
  const { chats, fetching, error, createChat } = useChatList({ searchQuery: searchValue });

  const handleNewChat = async () => {
    try {
      const chat = await createChat();
      router.push(`/chats/${chat.id}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create chat', 'Error');
    }
  };

  return (
    <SidebarLayout>
      <SidebarLayout.Header>
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Chats</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Chats</h1>
            <Button onClick={handleNewChat} variant="default" size="default" disabled={fetching}>
              <PlusIcon className="h-4 w-4" />
              New chat
            </Button>
          </div>
          <div className="max-w-3xl mx-auto w-full">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
                Error loading chats: {error.message}
              </div>
            )}
            <ChatList chats={chats} searchValue={searchValue} onSearchChange={setSearchValue} />
          </div>
        </div>
      </SidebarLayout.Content>
    </SidebarLayout>
  );
}
