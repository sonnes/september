import { createFileRoute } from '@tanstack/react-router';

import { pageTitle } from '@/lib/seo';
import { idFromSlug } from '@/packages/shared';

import { SpacePageInner } from '../-space-page';

export const Route = createFileRoute('/_app/spaces/$spaceSlug/notes')({
  head: () => ({
    meta: [{ title: pageTitle('Notes') }],
  }),
  component: NotesRoute,
});

function NotesRoute() {
  const { spaceSlug } = Route.useParams();
  const spaceId = idFromSlug(spaceSlug);

  return <SpacePageInner spaceId={spaceId} mode="notes" routeSpaceSlug={spaceSlug} />;
}
