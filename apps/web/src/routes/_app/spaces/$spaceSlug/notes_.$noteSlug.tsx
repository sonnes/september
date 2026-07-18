import { Navigate, createFileRoute } from '@tanstack/react-router';

import { pageTitle } from '@/lib/seo';
import { useNoteIdFromSlug } from '@/packages/notes';
import { useSpaceIdFromSlug } from '@/packages/spaces';
import { LoadingState } from '@/packages/ui/components/loading-state';

import { SpacePageInner } from '../-space-page';

export const Route = createFileRoute('/_app/spaces/$spaceSlug/notes_/$noteSlug')({
  head: () => ({
    meta: [{ title: pageTitle('Notes') }],
  }),
  component: NoteRoute,
});

function NoteRoute() {
  const { spaceSlug, noteSlug } = Route.useParams();
  const { spaceId, isLoading: spaceLoading } = useSpaceIdFromSlug(spaceSlug);
  const { noteId } = useNoteIdFromSlug(spaceId, noteSlug);

  if (!spaceId) {
    if (spaceLoading) return <LoadingState variant="page" label="Opening space..." />;
    return <Navigate to="/spaces" replace />;
  }

  return (
    <SpacePageInner
      spaceId={spaceId}
      mode="notes"
      noteId={noteId}
      noteSlug={noteSlug}
      routeSpaceSlug={spaceSlug}
    />
  );
}
