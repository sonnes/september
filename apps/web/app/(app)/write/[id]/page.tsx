'use client';

import React, { use } from 'react';

import { useRouter } from 'next/navigation';

import { DocumentEditor, EditableDocumentTitle, useDocuments } from '@september/documents';
import { ErrorState } from '@september/ui/components/error-state';
import { Separator } from '@september/ui/components/separator';
import { SidebarTrigger } from '@september/ui/components/sidebar';

import SidebarLayout from '@/components/sidebar/layout';

import { DocumentEditorSkeleton } from '../loading-skeleton';

type DocumentPageProps = {
  params: Promise<{ id: string }>;
};

export default function DocumentPage({ params }: DocumentPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { documents, isLoading } = useDocuments();

  const current = React.useMemo(() => {
    return id ? documents.find(doc => doc.id === id) || null : null;
  }, [documents, id]);

  const isInitializing = !id || isLoading;

  return (
    <>
      <SidebarLayout.Header>
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        {current && (
          <EditableDocumentTitle
            documentId={current.id}
            name={current.name}
            className="truncate text-sm font-medium"
          />
        )}
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6 md:py-8">
          {(isInitializing || isLoading) && <DocumentEditorSkeleton />}

          {!isInitializing && !isLoading && !current && (
            <ErrorState
              title="Document not found"
              description="The document you're looking for doesn't exist or couldn't be loaded."
              onRetry={() => router.push('/write')}
              retryLabel="Back to documents"
            />
          )}

          {!isInitializing && !isLoading && current && (
            <DocumentEditor documentId={current.id} className="flex-1 min-h-0" />
          )}
        </div>
      </SidebarLayout.Content>
    </>
  );
}
