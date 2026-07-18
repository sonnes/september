import { createFileRoute, redirect } from '@tanstack/react-router';

// Old speech page — voice now lives in the unified Voice page.
export const Route = createFileRoute('/_app/settings/speech')({
  beforeLoad: () => {
    throw redirect({ to: '/voice', replace: true });
  },
});
