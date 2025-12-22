'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { toast } from 'sonner';

import { ChatList, useChatList } from '@/packages/chats';
import SidebarLayout from '@/components/sidebar/layout';

import { ChatListSkeleton } from './loading-skeleton';

export default function ChatsPage() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const { chats, fetching, error, createChat } = useChatList({ searchQuery: searchValue });

  const handleNewChat = async () => {
    try {
      const chat = await createChat();
      router.push(`/chats/${chat.id}`);
    } catch (err) {
      toast.error('Error', {
        description: err instanceof Error ? err.message : 'Failed to create chat',
      });
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

          {/* Loading State */}
          {fetching && <ChatListSkeleton />}

          {/* Error State */}
          {!fetching && error && (
            <div className="max-w-3xl mx-auto w-full">
              <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800">Failed to load chats</h3>
                    <p className="mt-1 text-sm text-red-700">
                      {error.message || 'An unexpected error occurred while loading your chats.'}
                    </p>
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.reload()}
                        className="border-red-300 text-red-700 hover:bg-red-100"
                      >
                        Try again
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content State (empty handled by ChatList component) */}
          {!fetching && !error && (
            <div className="max-w-3xl mx-auto w-full">
              <ChatList chats={chats} searchValue={searchValue} onSearchChange={setSearchValue} />
            </div>
          )}
        </div>
      </SidebarLayout.Content>
    </SidebarLayout>
  );
}
