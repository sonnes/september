'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { use } from 'react';

import { TvIcon } from '@heroicons/react/24/outline';
import { PanelRightIcon } from 'lucide-react';
import { toast } from 'sonner';

import { useAccountContext } from '@september/account';
import { AudioOutputDeviceSelector, useAudioPlayer } from '@september/audio';
import {
  EditableChatTitle,
  MessageList,
  useChats,
  useCreateAudioMessage,
  useMessages,
  useUpdateChat,
} from '@september/chats';
import { Editor, useEditorContext } from '@september/editor';
import {
  KeyboardProvider,
  KeyboardRenderer,
  KeyboardToggleButton,
  useCreateKeyboard,
  useGenerateKeyboardFromMessage,
} from '@september/keyboards';
import { cn } from '@september/shared/lib/utils';
import { DisplayMessage } from '@september/shared/types/display';
import { SpeechSettingsModal } from '@september/speech';
import { Suggestions } from '@september/suggestions';
import { Button } from '@september/ui/components/button';
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
  const { text, setText, trackKeystroke, getAndResetStats } = useEditorContext();
  const { generateKeyboard } = useGenerateKeyboardFromMessage();
  const { createKeyboard } = useCreateKeyboard();
  const { updateChat } = useUpdateChat();
  const popupRef = useRef<Window | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const toggleHistory = useCallback(() => setIsHistoryOpen(prev => !prev), []);

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
      updateChat,
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

  return (
    <>
      <SidebarLayout.Header>
        {/* Mobile: branded top bar with logo, chat title, and display action */}
        <MobileNav title={chat?.title ?? 'Chat'}>
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
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleHistory}
              aria-label={isHistoryOpen ? 'Hide history' : 'Show history'}
              aria-pressed={isHistoryOpen}
              className="size-7"
            >
              <PanelRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <KeyboardProvider>
          <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-4">
            {/* History: top on mobile, collapsible right panel on desktop */}
            <aside
              data-state={isHistoryOpen ? 'open' : 'collapsed'}
              className={cn(
                'order-1 md:order-2 flex flex-col min-h-0 flex-1',
                'md:flex-none md:transition-[width,padding,border-color,opacity] md:duration-200 md:ease-linear md:overflow-hidden',
                isHistoryOpen
                  ? 'md:w-80 lg:w-96 md:border-l md:pl-4 md:opacity-100'
                  : 'md:w-0 md:border-l-0 md:pl-0 md:opacity-0 md:pointer-events-none'
              )}
              aria-hidden={!isHistoryOpen}
            >
              <div className="hidden md:flex items-center mb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  History
                </h2>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {(isInitializing || isLoading) && <ChatMessagesSkeleton />}

                {!isInitializing && !isLoading && error && (
                  <div className="py-4">
                    <ErrorState
                      title="Failed to load messages"
                      description={
                        error.message || 'Something went wrong while loading this conversation.'
                      }
                      onRetry={() => window.location.reload()}
                    />
                  </div>
                )}

                {!isInitializing && !isLoading && !error && (
                  <MessageList messages={messages || []} />
                )}
              </div>
            </aside>

            {/* Editor + keyboards: bottom on mobile, main left column on desktop */}
            <div className="order-2 md:order-1 flex flex-col justify-end min-h-0 md:flex-1 shrink-0">
              <div className="w-full max-w-3xl mx-auto flex flex-col gap-3">
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
          </div>
        </KeyboardProvider>
      </SidebarLayout.Content>
    </>
  );
}
