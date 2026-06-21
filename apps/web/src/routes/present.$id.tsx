import { createFileRoute } from '@tanstack/react-router';

import { ClientProviders } from '@/components/context/client-providers';

import { pageTitle } from '@/lib/seo';
import { SlidesPresentation, useNote } from '@/packages/notes';

export const Route = createFileRoute('/present/$id')({
  head: () => ({
    meta: [
      { title: pageTitle('Presentation') },
      { name: 'description', content: 'Note slide presentation' },
    ],
  }),
  component: PresentPageWrapper,
});

function PresentPageContent() {
  const { id } = Route.useParams();
  const { note, isLoading } = useNote(id);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-white" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <p className="text-white/60">Note not found.</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      <SlidesPresentation
        noteId={id}
        defaultVoiceOver={true}
        defaultAutoPlay={true}
        showFullscreenButton={false}
        className="h-full"
      />
    </div>
  );
}

function PresentPageWrapper() {
  return (
    <ClientProviders>
      <PresentPageContent />
    </ClientProviders>
  );
}
