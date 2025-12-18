'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { PlusIcon } from '@heroicons/react/24/outline';

import { useDocumentsContext } from '@/components/context/documents-provider';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { useToast } from '@/hooks/use-toast';

import SidebarLayout from '@/components/sidebar/layout';
import { DocumentList } from '@/components/write/document-list';

import { DocumentListSkeleton } from './loading-skeleton';

export default function WritePage() {
  const router = useRouter();
  const { showError } = useToast();
  const { documents, fetching, putDocument } = useDocumentsContext();
  const [searchValue, setSearchValue] = useState('');

  const handleNewDocument = async () => {
    try {
      const newDoc = await putDocument({ name: '', content: '' });
      router.push(`/write/${newDoc.id}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create document', 'Error');
    }
  };

  // Filter documents based on search
  const filteredDocuments = documents.filter(doc =>
    doc.name?.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <SidebarLayout>
      <SidebarLayout.Header>
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Write</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Write</h1>
            <Button
              onClick={handleNewDocument}
              variant="default"
              size="default"
              disabled={fetching}
            >
              <PlusIcon className="h-4 w-4" />
              New document
            </Button>
          </div>

          {/* Loading State */}
          {fetching && <DocumentListSkeleton />}

          {/* Content State (empty handled by DocumentList component) */}
          {!fetching && (
            <div className="max-w-3xl mx-auto w-full">
              <DocumentList
                documents={filteredDocuments}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
              />
            </div>
          )}
        </div>
      </SidebarLayout.Content>
    </SidebarLayout>
  );
}
