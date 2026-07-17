import { createFileRoute } from '@tanstack/react-router';

import { pageTitle } from '@/lib/seo';
import { idFromSlug } from '@/packages/shared';

import { SpacePageInner } from '../-space-page';

export const Route = createFileRoute('/_app/spaces/$spaceSlug/notes_/$noteSlug')({
  head: () => ({
    meta: [{ title: pageTitle('Notes') }],
  }),
  component: NoteRoute,
});

function NoteRoute() {
  const { spaceSlug, noteSlug } = Route.useParams();
  const spaceId = idFromSlug(spaceSlug);
  const noteId = idFromSlug(noteSlug);

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
