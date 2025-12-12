'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { MessageSquareIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { useAccount } from '@/components-v4/account';
import { EditorProvider } from '@/components-v4/editor/context';
import Editor from '@/components-v4/editor/editor';
import useMessages from '@/components-v4/messages/use-messages';
import SidebarLayout from '@/components-v4/sidebar/layout';
import { triplit } from '@/triplit/client';

type ChatMessage = {
  key: string;
  value: string;
  from: 'user' | 'assistant';
};

type ChatPageProps = {
  params: Promise<{ id: string }>;
};

export default function ChatPage({ params }: ChatPageProps) {
  const [chatId, setChatId] = useState<string | null>(null);
  const { user } = useAccount();

  useEffect(() => {
    params.then(resolvedParams => {
      setChatId(resolvedParams.id);
    });
  }, [params]);

  const { messages, fetching, error } = useMessages({
    chatId: chatId || '',
  });

  const chatMessages = useMemo<ChatMessage[]>(() => {
    if (!messages || messages.length === 0) return [];

    // Reverse messages since they're ordered DESC, we want oldest first
    return [...messages].reverse().map(message => ({
      key: message.id,
      value: message.text,
      from: (message.type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
    }));
  }, [messages]);

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!chatId || !user || !text.trim()) return;

      const messageId = uuidv4();
      await triplit.insert('messages', {
        id: messageId,
        text: text.trim(),
        type: 'user',
        user_id: user.id,
        chat_id: chatId,
        created_at: new Date(),
      });
    },
    [chatId, user]
  );

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
            {chatId && (
              <BreadcrumbItem>
                <BreadcrumbPage>{chatId}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <div className="pb-20">
          <Conversation className="relative flex-1">
            <ConversationContent>
              {fetching ? (
                <ConversationEmptyState
                  description="Loading messages..."
                  icon={<MessageSquareIcon className="size-6" />}
                  title="Loading"
                />
              ) : error ? (
                <ConversationEmptyState
                  description={error.message || 'Failed to load messages'}
                  icon={<MessageSquareIcon className="size-6" />}
                  title="Error"
                />
              ) : chatMessages.length === 0 ? (
                <ConversationEmptyState
                  description="Messages will appear here as the conversation progresses."
                  icon={<MessageSquareIcon className="size-6" />}
                  title="Start a conversation"
                />
              ) : (
                chatMessages.map(({ key, value, from }) => (
                  <Message from={from} key={key}>
                    <MessageContent>{value}</MessageContent>
                  </Message>
                ))
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>

        {/* Sticky Editor */}
        <EditorProvider>
          <div className="fixed bottom-0 left-0 right-0 p-4 md:left-(--sidebar-width) z-10">
            <div className="max-w-4xl mx-auto">
              <Editor placeholder="Type a message..." onSubmit={handleSubmit} />
            </div>
          </div>
        </EditorProvider>
      </SidebarLayout.Content>
    </SidebarLayout>
  );
}
