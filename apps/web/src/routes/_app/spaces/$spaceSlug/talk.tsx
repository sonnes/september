import { Navigate, createFileRoute } from '@tanstack/react-router';

import { pageTitle } from '@/lib/seo';
import { useSpaceIdFromSlug } from '@/packages/spaces';
import { LoadingState } from '@/packages/ui/components/loading-state';

import { SpacePageInner } from '../-space-page';

export const Route = createFileRoute('/_app/spaces/$spaceSlug/talk')({
  head: () => ({
    meta: [{ title: pageTitle('Talk') }],
  }),
  component: TalkRoute,
});

function TalkRoute() {
  const { spaceSlug } = Route.useParams();
  const { spaceId, isLoading } = useSpaceIdFromSlug(spaceSlug);

  if (!spaceId) {
    if (isLoading) return <LoadingState variant="page" label="Opening space..." />;
    return <Navigate to="/spaces" replace />;
  }

  return <SpacePageInner spaceId={spaceId} mode="talk" routeSpaceSlug={spaceSlug} />;
}
