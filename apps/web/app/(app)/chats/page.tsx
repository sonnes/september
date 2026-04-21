'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

import { ChatList, useChats, useCreateChat } from '@september/chats';
import { Button } from '@september/ui/components/button';
import { ErrorState } from '@september/ui/components/error-state';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import { ChatListSkeleton } from './loading-skeleton';

export default function ChatsPage() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const { chats, isLoading: fetching, error } = useChats({ searchQuery: searchValue });
  const { createChat } = useCreateChat();

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
    <>
      <SidebarLayout.Header>
        <PageHeader breadcrumbs={[{ label: 'Chats' }]} />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell>
          <PageTitle
            title="Chats"
            actions={
              <Button onClick={handleNewChat} disabled={fetching}>
                <PlusIcon className="size-4" />
                New chat
              </Button>
            }
          />

          {fetching && <ChatListSkeleton />}

          {!fetching && error && (
            <ErrorState
              title="Failed to load chats"
              description={error.message || 'An unexpected error occurred while loading your chats.'}
              onRetry={() => window.location.reload()}
            />
          )}

          {!fetching && !error && (
            <ChatList chats={chats} searchValue={searchValue} onSearchChange={setSearchValue} />
          )}
        </PageShell>
      </SidebarLayout.Content>
    </>
  );
}
