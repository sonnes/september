'use client';

import React, { use } from 'react';

import { useRouter } from 'next/navigation';

import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { useAccountContext } from '@/packages/account';
import SidebarLayout from '@/components/sidebar/layout';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { DocumentEditor, EditableDocumentTitle, useDocumentsContext } from '@/packages/documents';

import { DocumentEditorSkeleton } from '../loading-skeleton';

type DocumentPageProps = {
  params: Promise<{ id: string }>;
};

export default function DocumentPage({ params }: DocumentPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAccountContext();
  const { documents, fetching, current, setCurrentId } = useDocumentsContext();

  // Set the current document ID when the page loads
  React.useEffect(() => {
    if (id) {
      setCurrentId(id);
    }
  }, [id, setCurrentId]);

  // Loading state for document ID resolution
  const isInitializing = !id || fetching;

  return (
    <SidebarLayout>
      <SidebarLayout.Header>
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        {current && (
          <EditableDocumentTitle
            documentId={current.id}
            name={current.name}
            className="text-sm font-medium truncate"
          />
        )}
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <div className="pb-20">
          {/* Loading State */}
          {(isInitializing || fetching) && <DocumentEditorSkeleton />}

          {/* Error State */}
          {!isInitializing && !fetching && !current && (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 max-w-md w-full">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="rounded-full bg-red-100 p-3">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-red-800">
                      Failed to load document
                    </h3>
                    <p className="mt-1 text-sm text-red-700">
                      The document you're looking for doesn't exist or couldn't be loaded.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/write')}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Back to documents
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Document Editor */}
          {!isInitializing && !fetching && current && (
            <div className="max-w-4xl mx-auto w-full">
              <DocumentEditor className="flex-1 min-h-0" />
            </div>
          )}
        </div>
      </SidebarLayout.Content>
    </SidebarLayout>
  );
}
