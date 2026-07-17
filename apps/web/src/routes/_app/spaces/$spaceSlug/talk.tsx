import { createFileRoute } from '@tanstack/react-router';

import { pageTitle } from '@/lib/seo';
import { idFromSlug } from '@/packages/shared';

import { SpacePageInner } from '../-space-page';

export const Route = createFileRoute('/_app/spaces/$spaceSlug/talk')({
  head: () => ({
    meta: [{ title: pageTitle('Talk') }],
  }),
  component: TalkRoute,
});

function TalkRoute() {
  const { spaceSlug } = Route.useParams();
  const spaceId = idFromSlug(spaceSlug);

  return <SpacePageInner spaceId={spaceId} mode="talk" routeSpaceSlug={spaceSlug} />;
}
