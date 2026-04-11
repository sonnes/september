'use client';

import { useCallback } from 'react';

import { useAccountContext } from '@september/account';
import { TextViewer, TextViewerWords, useAudioPlayer } from '@september/audio';
import { useCreateAudioMessage } from '@september/chats';
import { Editor, useEditorContext } from '@september/editor';
import { KeyboardRenderer, KeyboardToggleButton } from '@september/keyboards';
import { SpeechSettingsModal } from '@september/speech';
import { Suggestions } from '@september/suggestions';
import { Separator } from '@september/ui/components/separator';
import { SidebarTrigger } from '@september/ui/components/sidebar';

import SidebarLayout from '@/components/sidebar/layout';

export default function TalkPage() {
  const { user } = useAccountContext();
  const { current, enqueue } = useAudioPlayer();
  const { text, setText, trackKeystroke } = useEditorContext();
  const { status, createAudioMessage } = useCreateAudioMessage();

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!user || !text.trim()) return;

      const { audio } = await createAudioMessage({
        text: text.trim(),
        type: 'user',
        user_id: user.id,
      });

      if (audio) {
        enqueue(audio);
      }

      setText('');
    },
    [user, createAudioMessage, enqueue, setText]
  );

  const handleKeyPress = useCallback(
    (key: string) => {
      if (key === 'ENTER') {
        handleSubmit(text);
        return;
      }

      trackKeystroke();

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
    [text, handleSubmit, setText, trackKeystroke]
  );

  return (
    <>
      <SidebarLayout.Header>
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <div className="pb-20">
          {current?.alignment && (
            <TextViewer alignment={current.alignment}>
              <TextViewerWords className="text-foreground wrap-break-word" />
            </TextViewer>
          )}
        </div>

        {/* Sticky Suggestions + Editor */}
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
      </SidebarLayout.Content>
    </>
  );
}
