import { createFileRoute, redirect } from '@tanstack/react-router';

// Old speech page — renamed to Voice.
export const Route = createFileRoute('/_app/settings/speech')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/voice', replace: true });
  },
});
