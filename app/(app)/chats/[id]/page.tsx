'use client';

import { useCallback } from 'react';
import { use } from 'react';

import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

import SidebarLayout from '@/components/sidebar/layout';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { useAccountContext } from '@/packages/account';
import { useAudioPlayer } from '@/packages/audio';
import {
  EditableChatTitle,
  MessageList,
  useChats,
  useCreateAudioMessage,
  useMessages,
  useUpdateChat,
} from '@/packages/chats';
import { Editor, useEditorContext } from '@/packages/editor';
import {
  KeyboardProvider,
  KeyboardRenderer,
  KeyboardToggleButton,
  useCreateKeyboard,
  useGenerateKeyboardFromMessage,
} from '@/packages/keyboards';
import { SpeechSettingsModal } from '@/packages/speech';
import { Suggestions } from '@/packages/suggestions';

import { ChatMessagesSkeleton } from '../loading-skeleton';

type ChatPageProps = {
  params: Promise<{ id: string }>;
};

export default function ChatPage({ params }: ChatPageProps) {
  const { id: chatId } = use(params);
  const { user } = useAccountContext();
  const { enqueue } = useAudioPlayer();
  const { chats, isLoading: chatsLoading, error: chatsError } = useChats({ userId: user?.id });
  const {
    messages,
    isLoading: messagesLoading,
    error: messagesError,
  } = useMessages({
    chatId: chatId || '',
  });

  const chat = chats.find(c => c.id === chatId);
  const isLoading = chatsLoading || messagesLoading;
  const error = (chatsError || messagesError) as Error | undefined;

  const { status, createAudioMessage } = useCreateAudioMessage();
  const { text, setText } = useEditorContext();
  const { generateKeyboard } = useGenerateKeyboardFromMessage();
  const { createKeyboard } = useCreateKeyboard();
  const { updateChat } = useUpdateChat();

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!chatId || !user || !text.trim()) return;

      // Check if this is the first message
      const isFirstMessage = messages?.length === 0;

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

      // Generate keyboard asynchronously for first message (non-blocking)
      if (isFirstMessage) {
        generateKeyboard({
          messageText: text.trim(),
          chatId,
        })
          .then(async data => {
            // Create keyboard with generated buttons and keyboard-specific title
            const keyboard = await createKeyboard({
              name: data.keyboardTitle,
              chat_id: chatId,
              columns: 3,
              user_id: user.id,
              buttons: data.buttons.map(text => ({ text })),
            });

            const chat = updateChat(chatId, {
              title: data.chatTitle,
            });

            await Promise.all([keyboard, chat]);

            toast.success('Custom keyboard generated for this chat');
          })
          .catch((err: Error) => {
            // Silent failure if API key not configured
            if (err.message !== 'API key not configured') {
              console.error('Failed to generate keyboard:', err);
              toast.error('Failed to generate keyboard suggestions');
            }
          });
      }
    },
    [chatId, user, createAudioMessage, enqueue, setText, messages, generateKeyboard, createKeyboard]
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
    <>
      <SidebarLayout.Header>
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        {chat && <EditableChatTitle chatId={chat.id} title={chat.title} />}
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <div className="pb-20">
          {/* Loading State */}
          {(isInitializing || isLoading) && <ChatMessagesSkeleton />}

          {/* Error State */}
          {!isInitializing && !isLoading && error && (
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
          {!isInitializing && !isLoading && !error && <MessageList messages={messages || []} />}
        </div>

        {/* Sticky Suggestions + Editor */}
        <KeyboardProvider>
          <div className="fixed bottom-0 left-0 right-0 p-4 md:left-(--sidebar-width) z-10">
            <div className="max-w-4xl mx-auto flex flex-col gap-3">
              <Suggestions chatId={chatId} />
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
    </>
  );
}
