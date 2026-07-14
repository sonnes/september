import { createFileRoute, redirect } from '@tanstack/react-router';

// Old suggestions page — renamed to Writing help.
export const Route = createFileRoute('/_app/settings/suggestions')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/writing', replace: true });
  },
});
