import { useCallback } from 'react';

import { createFileRoute } from '@tanstack/react-router';

import { useAccount } from '@/packages/account';
import { TextViewer, TextViewerWords, useAudioPlayer } from '@/packages/audio';
import { useCreateAudioMessage } from '@/packages/chats';
import { Editor, EditorProvider, useEditorContext } from '@/packages/editor';
import { KeyboardProvider, KeyboardRenderer, KeyboardToggleButton } from '@/packages/keyboards';
import { SpeechProvider, SpeechSettingsModal } from '@/packages/speech';
import { Suggestions } from '@/packages/suggestions';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import { pageTitle } from '@/lib/seo';

export const Route = createFileRoute('/_app/talk')({
  head: () => ({
    meta: [
      { title: pageTitle('Talk') },
      { name: 'description', content: 'Speak in your voice' },
    ],
  }),
  component: TalkPageWrapper,
});

function TalkPageContent() {
  const { user } = useAccount();
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

function TalkPageWrapper() {
  return (
    <EditorProvider>
      <SpeechProvider>
        <KeyboardProvider>
          <TalkPageContent />
        </KeyboardProvider>
      </SpeechProvider>
    </EditorProvider>
  );
}
