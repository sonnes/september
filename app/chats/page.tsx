'use client';

import { PlusIcon } from '@heroicons/react/24/outline';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { ChatList } from '@/components-v4/chat/chat-list';
import SidebarLayout from '@/components-v4/sidebar/layout';

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
            <Button
              onClick={() => console.log('New chat clicked')}
              variant="default"
              size="default"
            >
              <PlusIcon className="h-4 w-4" />
              New chat
            </Button>
          </div>
          <div className="max-w-3xl mx-auto w-full">
            <ChatList
              chats={chats}
              count={55}
              label="chats"
              onSearchChange={value => console.log('Search:', value)}
            />
          </div>
        </div>
      </SidebarLayout.Content>
    </SidebarLayout>
  );
}
