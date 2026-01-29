'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

import SidebarLayout from '@/components/sidebar/layout';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@september/ui/components/breadcrumb';
import { Button } from '@september/ui/components/button';
import { Separator } from '@september/ui/components/separator';
import { SidebarTrigger } from '@september/ui/components/sidebar';

import { DocumentList, useCreateDocument, useDocuments } from '@september/documents';

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

  // Filter documents based on search
  const filteredDocuments = documents.filter(doc =>
    doc.name?.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <>
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
              disabled={isLoading || isCreating}
            >
              <PlusIcon className="h-4 w-4" />
              New document
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && <DocumentListSkeleton />}

          {/* Content State (empty handled by DocumentList component) */}
          {!isLoading && (
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
    </>
  );
}
