import { createFileRoute } from '@tanstack/react-router';

import { pageTitle } from '@/lib/seo';

import { NotesPage } from '../-notes-page';

export const Route = createFileRoute('/_app/notes/$spaceSlug/$noteSlug')({
  head: () => ({
    meta: [{ title: pageTitle('Notes') }],
  }),
  component: NotePage,
});

function NotePage() {
  const { spaceSlug, noteSlug } = Route.useParams();

  return <NotesPage spaceSlug={spaceSlug} noteSlug={noteSlug} />;
}
