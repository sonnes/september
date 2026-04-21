'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

import { DocumentList, useCreateDocument, useDocuments } from '@september/documents';
import { Button } from '@september/ui/components/button';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import { DocumentListSkeleton } from './loading-skeleton';

export default function WritePage() {
  const router = useRouter();
  const { documents, isLoading } = useDocuments();
  const { createDocument, isCreating } = useCreateDocument();
  const [searchValue, setSearchValue] = useState('');

  const handleNewDocument = async () => {
    try {
      const newDoc = await createDocument({ name: '', content: '' });
      router.push(`/write/${newDoc.id}`);
    } catch (err) {
      toast.error('Error', {
        description: err instanceof Error ? err.message : 'Failed to create document',
      });
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
