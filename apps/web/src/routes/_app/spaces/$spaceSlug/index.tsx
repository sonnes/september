import { createFileRoute, redirect } from '@tanstack/react-router';

import { idFromSlug } from '@/packages/shared';

import { lastSpaceMode, routeForSpaceMode } from '../-space-mode';

export const Route = createFileRoute('/_app/spaces/$spaceSlug/')({
  beforeLoad: ({ params }) => {
    const spaceId = idFromSlug(params.spaceSlug);
    throw redirect({
      to: routeForSpaceMode(lastSpaceMode(spaceId)),
      params: { spaceSlug: params.spaceSlug },
      replace: true,
    });
  },
});
