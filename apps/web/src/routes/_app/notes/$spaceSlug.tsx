import { createFileRoute, redirect } from '@tanstack/react-router';

import { redirectNotesSpace } from '../spaces/-redirects';

// Legacy route — notes now live at /spaces/$spaceSlug/notes.
export const Route = createFileRoute('/_app/notes/$spaceSlug')({
  beforeLoad: ({ params }) => {
    throw redirect(redirectNotesSpace(params));
  },
});
