import { createFileRoute, redirect } from '@tanstack/react-router';

// Cloning now lives in the unified Voice page (opens as a drawer there).
export const Route = createFileRoute('/_app/clone')({
  beforeLoad: () => {
    throw redirect({ to: '/voice', replace: true });
  },
});
