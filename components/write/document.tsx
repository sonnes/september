'use client';

import React, { useCallback, useEffect } from 'react';

import { useDocumentsContext } from '@/components/context/documents-provider';
import TiptapEditor from '@/components/editor/tiptap-editor';

interface DocumentProps {
  className?: string;
}

export default function Document({ className = '' }: DocumentProps) {
  const { currentDocument, putContent, putDocument, setCurrentDocument } = useDocumentsContext();

  const handleContentChange = useCallback(
    async (content: string, markdown: string) => {
      if (!currentDocument?.id) return;

      putContent(currentDocument.id, markdown);
    },
    [currentDocument, putContent]
  );

  const handleSave = useCallback(
    async (content: string, markdown: string) => {
      if (!currentDocument?.id) {
        const newDoc = await putDocument({
          name: 'Untitled',
          content: markdown,
        });

        setCurrentDocument(newDoc);

        return;
      }

      putContent(currentDocument.id, markdown);
    },
    [currentDocument, putContent]
  );

  return (
    <div className={`h-full ${className}`}>
      <TiptapEditor
        content={currentDocument?.content || ''}
        placeholder="Start writing your story..."
        onChange={handleContentChange}
        onSave={handleSave}
        className="min-h-[600px]"
        theme="indigo"
      />
    </div>
  );
}
