import { Outlet, createFileRoute } from '@tanstack/react-router';

import { ChatPanelProvider } from '@/components/chat/use-chat-panel';

import { EditorProvider } from '@/packages/editor';
import { useSpaceIdFromSlug } from '@/packages/spaces';
import { SpeechProvider } from '@/packages/speech';

export const Route = createFileRoute('/_app/spaces/$spaceSlug')({
  component: SpaceLayout,
});

function SpaceLayout() {
  const { spaceSlug } = Route.useParams();
  const { spaceId } = useSpaceIdFromSlug(spaceSlug);

  return (
    <EditorProvider spaceId={spaceId}>
      <SpeechProvider>
        <ChatPanelProvider>
          <Outlet />
        </ChatPanelProvider>
      </SpeechProvider>
    </EditorProvider>
  );
}
