import { Outlet, createFileRoute } from '@tanstack/react-router';

import { EditorProvider } from '@/packages/editor';
import { idFromSlug } from '@/packages/shared';
import { SpeechProvider } from '@/packages/speech';

export const Route = createFileRoute('/_app/talk/$spaceSlug')({
  component: SpaceLayout,
});

function SpaceLayout() {
  const { spaceSlug } = Route.useParams();
  const spaceId = idFromSlug(spaceSlug);

  return (
    <EditorProvider spaceId={spaceId}>
      <SpeechProvider>
        <Outlet />
      </SpeechProvider>
    </EditorProvider>
  );
}
