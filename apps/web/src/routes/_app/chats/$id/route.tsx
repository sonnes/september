import { createFileRoute, Outlet } from '@tanstack/react-router';

import { EditorProvider } from '@september/editor';
import { SpeechProvider } from '@september/speech';

export const Route = createFileRoute('/_app/chats/$id')({
  component: ChatLayout,
});

function ChatLayout() {
  const { id } = Route.useParams();
  return (
    <EditorProvider chatId={id}>
      <SpeechProvider>
        <Outlet />
      </SpeechProvider>
    </EditorProvider>
  );
}
