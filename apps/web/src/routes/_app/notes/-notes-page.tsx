import { ChatPanelProvider } from '@/components/chat/use-chat-panel';

import { EditorProvider } from '@/packages/editor';
import { idFromSlug } from '@/packages/shared';
import { SpeechProvider } from '@/packages/speech';

import { SpacePageInner } from '../talk/$spaceSlug/index';

export function NotesPage({ spaceSlug, noteSlug }: { spaceSlug: string; noteSlug?: string }) {
  const spaceId = idFromSlug(spaceSlug);
  const noteId = noteSlug ? idFromSlug(noteSlug) : null;

  return (
    <EditorProvider spaceId={spaceId}>
      <SpeechProvider>
        <ChatPanelProvider>
          <SpacePageInner
            spaceId={spaceId}
            mode="notes"
            noteId={noteId}
            noteSlug={noteSlug}
            routeSpaceSlug={spaceSlug}
          />
        </ChatPanelProvider>
      </SpeechProvider>
    </EditorProvider>
  );
}
