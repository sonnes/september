import { createFileRoute, redirect } from '@tanstack/react-router';

// Voice browsing merged into the unified Voice page.
export const Route = createFileRoute('/_app/voices')({
  beforeLoad: () => {
    throw redirect({ to: '/voice', replace: true });
  },
});
