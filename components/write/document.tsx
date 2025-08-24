'use client';

import React, { useCallback, useEffect } from 'react';

import { useDocumentsContext } from '@/components/context/documents-provider';
import TiptapEditor from '@/components/editor/tiptap-editor';

import { TextInput } from '../ui/text-input';

interface DocumentProps {
  className?: string;
}

export default function Document({ className = '' }: DocumentProps) {
  const { current, putDocument } = useDocumentsContext();

  const handleContentSave = useCallback(
    async (content: string, markdown: string) => {
      if (!current?.id) return;

      putDocument({ ...current, content: markdown });
    },
    [current, putDocument]
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!current?.id) return;
      putDocument({ ...current, name: e.target.value });
    },
    [current, putDocument]
  );

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <div className="mb-6">
        <TextInput
          value={current?.name || ''}
          onChange={handleNameChange}
          placeholder="Untitled"
          className="text-2xl font-bold text-gray-900 border-0 shadow-none bg-transparent px-0 py-2"
        />
      </div>

      <TiptapEditor
        content={current?.content || ''}
        placeholder="Start writing your story..."
        onSave={handleContentSave}
        className="flex-1 min-h-0"
        theme="indigo"
      />
    </div>
  );
}
