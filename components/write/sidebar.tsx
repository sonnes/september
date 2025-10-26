'use client';

import React from 'react';

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DocumentIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import moment from 'moment';

import { useDocumentsContext } from '@/components/context/documents-provider';
import { Button } from '@/components/ui/button';

interface DocumentsSidebarProps {
  className?: string;
}

export default function DocumentsSidebar({}: DocumentsSidebarProps) {
  const { documents, fetching, current, deleteDocument, putDocument } = useDocumentsContext();

  const handleCreateDocument = async () => {
    const newDoc = await putDocument({ name: '', content: '' });
    redirect(`/write/${newDoc.id}`);
  };

  const handleDeleteDocument = async (id: string) => {
    await deleteDocument(id);
  };

  const documentsArray = documents || [];

  return (
    <div className="flex flex-col h-full bg-white border-r border-zinc-200 w-64">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Documents</h2>
          <Button
            onClick={handleCreateDocument}
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            disabled={fetching}
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto">
        {fetching && (
          <div className="p-4 text-center text-zinc-500">
            <p>Loading documents...</p>
          </div>
        )}

        {!fetching && documentsArray.length === 0 && (
          <div className="p-4 text-center text-zinc-500">
            <DocumentIcon className="h-12 w-12 mx-auto mb-2 text-zinc-300" />
            <p className="text-sm">No documents yet</p>
            <p className="text-xs text-zinc-400">Create your first document</p>
          </div>
        )}

        <div className="p-2">
          {documentsArray.map(document => (
            <Link
              href={`/write/${document.id}`}
              key={document.id}
              className={`group relative flex items-center p-3 rounded-lg cursor-pointer hover:bg-zinc-50 transition-colors ${
                current?.id === document.id
                  ? 'bg-indigo-50 border border-indigo-200'
                  : 'border border-transparent'
              }`}
            >
              <DocumentIcon className="h-5 w-5 text-zinc-400 mr-3 shrink-0" />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    current?.id === document.id ? 'text-indigo-700' : 'text-zinc-900'
                  }`}
                >
                  {document.name || 'Untitled'}
                </p>
                <p className="text-xs text-zinc-500">{moment(document.updated_at).fromNow()}</p>
              </div>
              <button
                onClick={() => handleDeleteDocument(document.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-indigo-500 transition-all"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
