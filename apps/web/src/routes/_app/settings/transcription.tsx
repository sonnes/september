import { createFileRoute, redirect } from '@tanstack/react-router';

// Old transcription page — renamed to Listening.
export const Route = createFileRoute('/_app/settings/transcription')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/listening', replace: true });
  },
});
