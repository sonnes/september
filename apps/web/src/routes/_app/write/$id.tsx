import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { DocumentEditor, EditableDocumentTitle, useDocument } from '@/packages/documents';
import { ErrorState } from '@/packages/ui/components/error-state';
import { Separator } from '@/packages/ui/components/separator';
import { SidebarTrigger } from '@/packages/ui/components/sidebar';

import SidebarLayout from '@/components/sidebar/layout';

import { DocumentEditorSkeleton } from './-loading-skeleton';

export const Route = createFileRoute('/_app/write/$id')({
  component: DocumentPage,
});

function DocumentPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { document: current, isLoading } = useDocument(id);

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
              onRetry={() => navigate({ to: '/write' })}
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
