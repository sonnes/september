import { createFileRoute } from '@tanstack/react-router';

import { pageTitle } from '@/lib/seo';

import { NotesPage } from './-notes-page';

export const Route = createFileRoute('/_app/notes/$spaceSlug')({
  head: () => ({
    meta: [{ title: pageTitle('Notes') }],
  }),
  component: SpaceNotesPage,
});

function SpaceNotesPage() {
  const { spaceSlug } = Route.useParams();

  return <NotesPage spaceSlug={spaceSlug} />;
}
