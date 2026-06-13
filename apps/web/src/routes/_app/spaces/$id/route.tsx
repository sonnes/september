import { createFileRoute, Outlet } from '@tanstack/react-router';

import { EditorProvider } from '@/packages/editor';
import { SpeechProvider } from '@/packages/speech';

export const Route = createFileRoute('/_app/spaces/$id')({
  component: SpaceLayout,
});

function SpaceLayout() {
  const { id } = Route.useParams();
  return (
    <EditorProvider spaceId={id}>
      <SpeechProvider>
        <Outlet />
      </SpeechProvider>
    </EditorProvider>
  );
}
