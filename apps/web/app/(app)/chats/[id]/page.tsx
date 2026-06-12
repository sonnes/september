'use client';

import { useCallback, useEffect, useRef } from 'react';
import { use } from 'react';

import { TvIcon } from '@heroicons/react/24/outline';
import { HistoryIcon } from 'lucide-react';
import { toast } from 'sonner';

import { useAccount } from '@september/account';
import { AudioOutputDeviceSelector, useAudioPlayer } from '@september/audio';
import {
  EditableChatTitle,
  MessageList,
  updateChat,
  useChats,
  useCreateAudioMessage,
  useMessages,
} from '@september/chats';
import { Editor, useEditorContext } from '@september/editor';
import {
  KeyboardProvider,
  KeyboardRenderer,
  KeyboardToggleButton,
  useCreateKeyboard,
  useGenerateKeyboardFromMessage,
} from '@september/keyboards';
import { DisplayMessage } from '@september/shared';
import { SpeechSettingsModal } from '@september/speech';
import { Suggestions } from '@september/suggestions';
import { Button } from '@september/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@september/ui/components/dialog';
import { ErrorState } from '@september/ui/components/error-state';
import { Separator } from '@september/ui/components/separator';
import { SidebarTrigger } from '@september/ui/components/sidebar';

import MobileNav from '@/components/nav/mobile';
import SidebarLayout from '@/components/sidebar/layout';

import { ChatMessagesSkeleton } from '../loading-skeleton';

type ChatPageProps = {
  params: Promise<{ id: string }>;
};

export default function ChatPage({ params }: ChatPageProps) {
  const { id: chatId } = use(params);
  const { user } = useAccount();
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
  const { text, setText, trackKeystroke, getAndResetStats } = useEditorContext();
  const { generateKeyboard } = useGenerateKeyboardFromMessage();
  const { createKeyboard } = useCreateKeyboard();
  const popupRef = useRef<Window | null>(null);

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!chatId || !user || !text.trim()) return;

      const isFirstMessage = messages?.length === 0;
      const editorStats = getAndResetStats();

      const { message, audio } = await createAudioMessage({
        chat_id: chatId,
        text: text.trim(),
        type: 'user',
        user_id: user.id,
        editorStats,
      });

      const isDisplayOpen = popupRef.current && !popupRef.current.closed;

      if (audio && !isDisplayOpen) {
        enqueue(audio);
      }

      const channel = new BroadcastChannel(`chat-display-${chatId}`);
      channel.postMessage({
        type: 'new-message',
        message,
        audio: audio?.blob,
        alignment: audio?.alignment,
        timestamp: Date.now(),
      } satisfies DisplayMessage);
      channel.close();

      setText('');

      if (isFirstMessage) {
        generateKeyboard({
          messageText: text.trim(),
          chatId,
        })
          .then(async data => {
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
            if (err.message !== 'API key not configured') {
              console.error('Failed to generate keyboard:', err);
              toast.error('Failed to generate keyboard suggestions');
            }
          });
      }
    },
    [
      chatId,
      user,
      createAudioMessage,
      enqueue,
      setText,
      messages,
      generateKeyboard,
      createKeyboard,
      getAndResetStats,
    ]
  );

  const handleKeyPress = useCallback(
    (key: string) => {
      trackKeystroke();

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
          return text + key;
        } else {
          return text + key;
        }
      });
    },
    [text, handleSubmit, setText, trackKeystroke]
  );

  const handleOpenDisplay = useCallback(() => {
    const width = 375;
    const height = 667;
    const left = 100;
    const top = 100;

    const popup = window.open(
      `/display/${chatId}`,
      `display-${chatId}`,
      `width=${width},height=${height},left=${left},top=${top},popup=1`
    );

    if (popup && !popup.closed) {
      popup.focus();
    }

    popupRef.current = popup;
  }, [chatId]);

  useEffect(() => {
    return () => {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, [chatId]);

  const isInitializing = !chatId;

  const messagesContent = (
    <>
      {(isInitializing || isLoading) && <ChatMessagesSkeleton />}

      {!isInitializing && !isLoading && error && (
        <div className="py-10">
          <ErrorState
            title="Failed to load messages"
            description={error.message || 'Something went wrong while loading this conversation.'}
            onRetry={() => window.location.reload()}
          />
        </div>
      )}

      {!isInitializing && !isLoading && !error && <MessageList messages={messages || []} />}
    </>
  );

  const historyDialog = (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="View history"
          className="size-7"
        >
          <HistoryIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>History</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-1">{messagesContent}</div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <SidebarLayout.Header>
        {/* Mobile: branded top bar with logo, chat title, and display action */}
        <MobileNav title={chat?.title ?? 'Chat'}>
          {historyDialog}
          <Button variant="ghost" size="icon" onClick={handleOpenDisplay}>
            <TvIcon className="size-4" />
          </Button>
        </MobileNav>

        {/* Desktop: inline sidebar trigger + title + actions */}
        <div className="hidden w-full items-center gap-2 md:flex">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          {chat && <EditableChatTitle chatId={chat.id} title={chat.title} />}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleOpenDisplay}>
              <TvIcon className="size-4" />
              <span>Display</span>
            </Button>
            {historyDialog}
          </div>
        </div>
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <KeyboardProvider>
          {/* Composer: pinned at the bottom of the main area. History lives in the dialog. */}
          <div className="mt-auto shrink-0">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
              <Suggestions chatId={chatId} />
              <Editor
                placeholder="Type a message..."
                onSubmit={handleSubmit}
                disabled={status !== 'idle'}
              >
                <KeyboardToggleButton />
                <SpeechSettingsModal />
                <AudioOutputDeviceSelector />
              </Editor>
              <KeyboardRenderer chatId={chatId} onKeyPress={handleKeyPress} stickyQwerty />
            </div>
          </div>
        </KeyboardProvider>
      </SidebarLayout.Content>
    </>
  );
}
