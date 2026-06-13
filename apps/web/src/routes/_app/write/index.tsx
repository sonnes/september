import { useState } from 'react';

import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

import { DocumentList, createDocument, useDocuments } from '@september/documents';
import { Button } from '@september/ui/components/button';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import { pageTitle } from '@/lib/seo';

import { DocumentListSkeleton } from './-loading-skeleton';

export const Route = createFileRoute('/_app/write/')({
  head: () => ({
    meta: [
      { title: pageTitle('Write') },
      { name: 'description', content: 'Create and edit documents.' },
    ],
  }),
  component: WritePage,
});

function WritePage() {
  const navigate = useNavigate();
  const { documents, isLoading } = useDocuments();
  const [isCreating, setIsCreating] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleNewDocument = async () => {
    setIsCreating(true);
    try {
      const newDoc = await createDocument({ name: '', content: '' });
      toast.success('Document created');
      navigate({ to: '/write/$id', params: { id: newDoc.id } });
    } catch (err) {
      toast.error('Error', {
        description: err instanceof Error ? err.message : 'Failed to create document',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name?.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <>
      <SidebarLayout.Header>
        <PageHeader breadcrumbs={[{ label: 'Write' }]} />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell>
          <PageTitle
            title="Write"
            actions={
              <Button onClick={handleNewDocument} disabled={isLoading || isCreating}>
                <PlusIcon className="size-4" />
                New document
              </Button>
            }
          />

          {isLoading && <DocumentListSkeleton />}

          {!isLoading && (
            <DocumentList
              documents={filteredDocuments}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
            />
          )}
        </PageShell>
      </SidebarLayout.Content>
    </>
  );
}
