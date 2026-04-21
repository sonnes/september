'use client';

import { useCallback } from 'react';

import { useAccountContext } from '@september/account';
import { TextViewer, TextViewerWords, useAudioPlayer } from '@september/audio';
import { useCreateAudioMessage } from '@september/chats';
import { Editor, useEditorContext } from '@september/editor';
import { KeyboardRenderer, KeyboardToggleButton } from '@september/keyboards';
import { SpeechSettingsModal } from '@september/speech';
import { Suggestions } from '@september/suggestions';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
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
          return text + key;
        } else {
          return text + key;
        }
      });
    },
    [text, handleSubmit, setText, trackKeystroke]
  );

  return (
    <>
      <SidebarLayout.Header>
        <PageHeader breadcrumbs={[{ label: 'Talk' }]} />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell width="full">
          <PageTitle
            title="Talk"
            description="Speak a one-off message without starting a chat."
          />

          <div className="pb-24">
            {current?.alignment && (
              <TextViewer alignment={current.alignment}>
                <TextViewerWords className="wrap-break-word text-foreground" />
              </TextViewer>
            )}
          </div>
        </PageShell>

        {/* Sticky Suggestions + Editor */}
        <div className="fixed right-0 bottom-0 left-0 z-10 p-4 md:left-(--sidebar-width)">
          <div className="mx-auto flex max-w-4xl flex-col gap-3">
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
