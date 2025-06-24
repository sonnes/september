'use client';

import { useState } from 'react';

import MarkdownEditor from '@/app/app/write/markdown/editor';

export default function Editor() {
  const [content, setContent] = useState('Welcome to your markdown editor\n\nHappy writing! 🚀');

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };
  return (
    <div className="relative p-2 md:p-4 bg-white rounded-lg shadow-xs ring-1 ring-zinc-950/5 h-full">
      <MarkdownEditor
        content={content}
        onContentChange={handleContentChange}
        ariaLabel="Markdown editor"
      />
    </div>
  );
}
