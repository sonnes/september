'use client';

import { useCallback } from 'react';
import { use } from 'react';

import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { useAccount } from '@/packages/account';
import { useAudioPlayer } from '@/packages/audio';
import { KeyboardProvider, KeyboardRenderer, KeyboardToggleButton } from '@/packages/keyboards';
import SidebarLayout from '@/components/sidebar/layout';
import { SpeechSettingsModal } from '@/packages/speech';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import {
  EditableChatTitle,
  MessageList,
  useCreateAudioMessage,
  useChatMessages,
} from '@/packages/chats';
import { Editor, EditorProvider, useEditorContext } from '@/packages/editor';
import { Suggestions } from '@/packages/suggestions';

import { ChatMessagesSkeleton } from '../loading-skeleton';

type ChatPageProps = {
  params: Promise<{ id: string }>;
};

export default function ChatPage({ params }: ChatPageProps) {
  const { id: chatId } = use(params);
  const { user } = useAccount();
  const { enqueue } = useAudioPlayer();
  const { chat, messages, fetching, error } = useChatMessages({
    chatId: chatId || '',
  });

  const { status, createAudioMessage } = useCreateAudioMessage();
  const { text, setText } = useEditorContext();

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!chatId || !user || !text.trim()) return;

      const { audio } = await createAudioMessage({
        chat_id: chatId,
        text: text.trim(),
        type: 'user',
        user_id: user.id,
      });

      if (audio) {
        enqueue(audio);
      }

      setText('');
    },
    [chatId, user, createAudioMessage]
  );

  const handleKeyPress = useCallback(
    (key: string) => {
      if (key === 'ENTER') {
        handleSubmit(text);
        return;
      }

      setText(text => {
        if (key === 'BACKSPACE') {
          return text.slice(0, -1);
        } else if (key === 'SPACE') {
          return text + ' ';
        } else if (/^[0-9]$/.test(key)) {
          // Numbers should be added as-is
          return text + key;
        } else {
          // Regular characters (already transformed by keyboard component if needed)
          return text + key;
        }
      });
    },
    [text, handleSubmit, setText]
  );

  // Loading state for chat ID resolution
  const isInitializing = !chatId;

  return (
    <SidebarLayout>
      <SidebarLayout.Header>
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        {chat && <EditableChatTitle chatId={chat.id} title={chat.title} />}
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <div className="pb-20">
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
                      {error.message || 'Something went wrong while loading this conversation.'}
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

          {/* Messages */}
          {!isInitializing && !fetching && !error && <MessageList messages={messages || []} />}
        </div>

        {/* Sticky Suggestions + Editor */}
        <KeyboardProvider>
          <div className="fixed bottom-0 left-0 right-0 p-4 md:left-(--sidebar-width) z-10">
            <div className="max-w-4xl mx-auto flex flex-col gap-3">
              <Suggestions />
              <Editor
                placeholder="Type a message..."
                onSubmit={handleSubmit}
                disabled={status !== 'idle'}
              >
                <KeyboardToggleButton />
                <SpeechSettingsModal />
              </Editor>
              <KeyboardRenderer onKeyPress={handleKeyPress} />
            </div>
          </div>
        </KeyboardProvider>
      </SidebarLayout.Content>
    </SidebarLayout>
  );
}
