'use client';

import { useCallback } from 'react';

import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { useAccount } from '@/components-v4/account';
import { useAudioPlayer } from '@/components-v4/audio/audio-player';
import { useEditorContext } from '@/components-v4/editor/context';
import Editor from '@/components-v4/editor/editor';
import {
  KeyboardProvider,
  KeyboardRenderer,
  KeyboardToggleButton,
} from '@/components-v4/keyboards';
import { useCreateAudioMessage } from '@/components-v4/messages/use-create-message';
import SidebarLayout from '@/components-v4/sidebar/layout';
import { SpeechSettingsModal } from '@/components-v4/speech';
import { Suggestions } from '@/components-v4/suggestions';
import { TextViewer, TextViewerWords } from '@/components-v4/text-viewer';

export default function TalkPage() {
  const { user } = useAccount();
  const { current, enqueue } = useAudioPlayer();
  const { text, setText } = useEditorContext();
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
    [user, createAudioMessage]
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

  return (
    <SidebarLayout>
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
