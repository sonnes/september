'use client';

import { useState } from 'react';

import MarkdownEditor from '@/app/app/write/markdown/editor';

export default function Editor() {
  const [content, setContent] = useState(
    "# Welcome to your markdown editor\n\nStart writing your thoughts here. You can use:\n\n- **Bold text** with double asterisks\n- *Italic text* with single asterisks\n- [Links](https://example.com) with bracket notation\n- Lists like this one\n\n## Headers work too\n\nJust start a line with # for headers. The more #'s, the smaller the header.\n\n---\n\nHappy writing! 🚀"
  );

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
