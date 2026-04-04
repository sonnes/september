'use client';

import { use } from 'react';

import { SlidesPresentation, useDocuments } from '@september/documents';

type PresentPageProps = {
  params: Promise<{ id: string }>;
};

export default function PresentPage({ params }: PresentPageProps) {
  const { id } = use(params);
  const { documents, isLoading } = useDocuments();
  const document = documents.find(doc => doc.id === id);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-white" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <p className="text-white/60">Document not found.</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      <SlidesPresentation
        documentId={id}
        defaultVoiceOver={true}
        defaultAutoPlay={true}
        showFullscreenButton={false}
        className="h-full"
      />
    </div>
  );
}
