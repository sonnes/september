'use client';

import React, { useCallback, useEffect } from 'react';

import { useDocumentsContext } from '@/components/context/documents-provider';
import TiptapEditor from '@/components/editor/tiptap-editor';

interface DocumentProps {
  className?: string;
}

export default function Document({ className = '' }: DocumentProps) {
  const { currentDocument, updateDocument } = useDocumentsContext();

  const handleContentChange = useCallback(
    (content: string, markdown: string) => {
      if (!currentDocument?.id) return;

      // Update the document content
      updateDocument(currentDocument.id, {
        content: markdown,
      });
    },
    [currentDocument, updateDocument]
  );

  const handleSave = useCallback(
    (content: string, markdown: string) => {
      if (!currentDocument?.id) return;

      // Explicit save action
      updateDocument(currentDocument.id, {
        content: markdown,
      });
    },
    [currentDocument, updateDocument]
  );

  if (!currentDocument) {
    return (
      <div className={`flex items-center justify-center h-full text-gray-500 ${className}`}>
        <div className="text-center">
          <p className="text-lg mb-2">No document selected</p>
          <p className="text-sm">Select a document from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full ${className}`}>
      <TiptapEditor
        content={currentDocument.content || '<p>Start writing...</p>'}
        placeholder="Start writing your story..."
        onChange={handleContentChange}
        onSave={handleSave}
        className="min-h-[600px]"
        theme="indigo"
      />
    </div>
  );
}
