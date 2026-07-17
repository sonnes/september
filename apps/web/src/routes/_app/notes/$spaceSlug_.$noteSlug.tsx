import { createFileRoute, redirect } from '@tanstack/react-router';

import { redirectNotesNote } from '../spaces/-redirects';

// Legacy route — a specific note now lives at
// /spaces/$spaceSlug/notes/$noteSlug. Escaped from the $spaceSlug parent so
// its own redirect (preserving the note slug) runs instead of the parent's.
export const Route = createFileRoute('/_app/notes/$spaceSlug_/$noteSlug')({
  beforeLoad: ({ params }) => {
    throw redirect(redirectNotesNote(params));
  },
});
