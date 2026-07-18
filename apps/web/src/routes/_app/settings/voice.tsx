import { createFileRoute, redirect } from '@tanstack/react-router';

// Voice selection moved out of Settings into the unified Voice page.
export const Route = createFileRoute('/_app/settings/voice')({
  beforeLoad: () => {
    throw redirect({ to: '/voice', replace: true });
  },
});
