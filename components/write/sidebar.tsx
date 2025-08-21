'use client';

import React, { useCallback } from 'react';

import {
  Bars3Icon,
  DocumentIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { useDocumentsContext } from '@/components/context/documents-provider';
import { Button } from '@/components/ui/button';
import { Document } from '@/types/document';

interface DocumentsSidebarProps {
  className?: string;
}

export default function DocumentsSidebar({ className = '' }: DocumentsSidebarProps) {
  const {
    documents,
    fetching,
    error,
    currentDocument,
    setCurrentDocument,
    deleteDocument,
    createNewDocument,
  } = useDocumentsContext();

  const handleCreateDocument = useCallback(async () => {
    try {
      const newDoc = await createNewDocument();
      setCurrentDocument(newDoc);
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  }, [createNewDocument, setCurrentDocument]);

  const handleSelectDocument = useCallback(
    (document: Document) => {
      setCurrentDocument(document);
    },
    [setCurrentDocument]
  );

  const handleDeleteDocument = useCallback(
    async (document: Document, event: React.MouseEvent) => {
      event.stopPropagation();

      if (confirm(`Are you sure you want to delete "${document.name}"?`)) {
        try {
          await deleteDocument(document.id);
          // If we're deleting the current document, clear the selection
          if (currentDocument?.id === document.id) {
            setCurrentDocument(null);
          }
        } catch (error) {
          console.error('Failed to delete document:', error);
        }
      }
    },
    [deleteDocument, currentDocument, setCurrentDocument]
  );

  const documentsArray = documents || [];

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-64">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
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
          <div className="p-4 text-center text-gray-500">
            <p>Loading documents...</p>
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-red-500">
            <p>Error loading documents</p>
          </div>
        )}

        {!fetching && !error && documentsArray.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            <DocumentIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No documents yet</p>
            <p className="text-xs text-gray-400">Create your first document</p>
          </div>
        )}

        <div className="p-2">
          {documentsArray.map(document => (
            <div
              key={document.id}
              onClick={() => handleSelectDocument(document)}
              className={`group relative flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                currentDocument?.id === document.id
                  ? 'bg-indigo-50 border border-indigo-200'
                  : 'border border-transparent'
              }`}
            >
              <DocumentIcon className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    currentDocument?.id === document.id ? 'text-indigo-700' : 'text-gray-900'
                  }`}
                >
                  {document.name || 'Untitled'}
                </p>
                <p className="text-xs text-gray-500">{document.updated_at.toLocaleDateString()}</p>
              </div>
              <button
                onClick={e => handleDeleteDocument(document, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
