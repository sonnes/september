'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { use } from 'react';

import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

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
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { useAccount } from '@/components-v4/account';
import { useAudioPlayer } from '@/components-v4/audio/audio-player';
import { EditorProvider } from '@/components-v4/editor/context';
import Editor from '@/components-v4/editor/editor';
import { useCreateAudioMessage } from '@/components-v4/messages/use-create-message';
import useMessages from '@/components-v4/messages/use-messages';
import SidebarLayout from '@/components-v4/sidebar/layout';
import { Suggestions } from '@/components-v4/suggestions';

import { ChatMessagesSkeleton } from '../loading-skeleton';

type ChatMessage = {
  key: string;
  value: string;
  from: 'user' | 'assistant';
};

type ChatPageProps = {
  params: Promise<{ id: string }>;
};

export default function ChatPage({ params }: ChatPageProps) {
  const { id: chatId } = use(params);
  const { user } = useAccount();
  const { enqueue } = useAudioPlayer();
  const { chat, messages, fetching, error } = useMessages({
    chatId: chatId || '',
  });

  const { createAudioMessage } = useCreateAudioMessage();
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

      const { audio } = await createAudioMessage({
        chat_id: chatId,
        text: text.trim(),
        type: 'user',
        user_id: user.id,
      });

      console.log('audio', audio);
      if (audio) {
        enqueue(audio);
      }
    },
    [chatId, user, createAudioMessage]
  );

  // Loading state for chat ID resolution
  const isInitializing = !chatId;

  return (
    <EditorProvider>
      <SidebarLayout>
        <SidebarLayout.Header>
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Chats</BreadcrumbPage>
              </BreadcrumbItem>
              {chat && (
                <BreadcrumbItem>
                  <ChevronRightIcon className="size-2" />
                  <BreadcrumbPage>{chat.title ?? 'Untitled'}</BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </SidebarLayout.Header>
        <SidebarLayout.Content>
          <div className="pb-20">
            <Conversation className="relative flex-1">
              <ConversationContent>
                {/* Loading State */}
                {(isInitializing || fetching) && <ChatMessagesSkeleton />}

                {/* Error State */}
                {!isInitializing && !fetching && error && (
                  <div className="flex flex-col items-center justify-center h-full p-8">
                    <div className="rounded-lg border border-red-200 bg-red-50 p-6 max-w-md w-full">
                      <div className="flex flex-col items-center text-center gap-4">
                        <div className="rounded-full bg-red-100 p-3">
                          <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-red-800">
                            Failed to load messages
                          </h3>
                          <p className="mt-1 text-sm text-red-700">
                            {error.message ||
                              'Something went wrong while loading this conversation.'}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.reload()}
                          className="border-red-300 text-red-700 hover:bg-red-100"
                        >
                          <ArrowPathIcon className="h-4 w-4 mr-2" />
                          Try again
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!isInitializing && !fetching && !error && chatMessages.length === 0 && (
                  <ConversationEmptyState
                    description="Start typing below to begin your conversation."
                    icon={<ChatBubbleLeftRightIcon className="size-8 text-zinc-400" />}
                    title="No messages yet"
                  />
                )}

                {/* Messages */}
                {!isInitializing &&
                  !fetching &&
                  !error &&
                  chatMessages.length > 0 &&
                  chatMessages.map(({ key, value, from }) => (
                    <Message from={from} key={key}>
                      <MessageContent>{value}</MessageContent>
                    </Message>
                  ))}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
          </div>

          {/* Sticky Suggestions + Editor */}
          <div className="fixed bottom-0 left-0 right-0 p-4 md:left-(--sidebar-width) z-10">
            <div className="max-w-4xl mx-auto flex flex-col gap-3">
              <Suggestions />
              <Editor placeholder="Type a message..." onSubmit={handleSubmit} />
            </div>
          </div>
        </SidebarLayout.Content>
      </SidebarLayout>
    </EditorProvider>
  );
}
