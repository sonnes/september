'use client';

import { useState } from 'react';

import MarkdownEditor from '@/components/editor/markdown-editor';

export default function Editor() {
  const [content, setContent] = useState('<p>Start writing...</p>');

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  return (
    <div className="p-2 md:p-4 bg-white rounded-lg shadow-xs ring-1 ring-zinc-950/5 h-full">
      <MarkdownEditor content={content} onContentChange={handleContentChange} />
    </div>
  );
}
