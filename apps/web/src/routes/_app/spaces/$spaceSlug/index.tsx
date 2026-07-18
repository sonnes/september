import { createFileRoute, redirect } from '@tanstack/react-router';

import { lastSpaceMode, routeForSpaceMode } from '../-space-mode';

export const Route = createFileRoute('/_app/spaces/$spaceSlug/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: routeForSpaceMode(lastSpaceMode(params.spaceSlug)),
      params: { spaceSlug: params.spaceSlug },
      replace: true,
    });
  },
});
