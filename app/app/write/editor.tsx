'use client';

import { useState } from 'react';

import ActionMenu from '@/components/markdown/action-menu';
import MarkdownEditor from '@/components/markdown/editor';

export default function Editor() {
  const [content, setContent] = useState(
    "# Welcome to your markdown editor\n\nStart writing your thoughts here. You can use:\n\n- **Bold text** with double asterisks\n- *Italic text* with single asterisks\n- [Links](https://example.com) with bracket notation\n- Lists like this one\n\n## Headers work too\n\nJust start a line with # for headers. The more #'s, the smaller the header.\n\n---\n\nHappy writing! 🚀"
  );

  // State for block action menu
  const [selectedBlockText, setSelectedBlockText] = useState<string | null>(null);
  const [actionMenuCoords, setActionMenuCoords] = useState<{ top: number; left: number } | null>(
    null
  );
  const [isActionMenuVisible, setIsActionMenuVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const handlePlay = () => {
    if (!selectedBlockText) return;
    setIsLoading(true);
    // Simulate async action for logging
    setTimeout(() => {
      console.log('Selected block text:', selectedBlockText);
      setIsLoading(false);
    }, 300);
  };

  // Placeholder: In the next steps, this will be updated by block-actions extension or editor events
  // Example usage:
  // function onBlockSelect(text: string, coords: { top: number; left: number }) {
  //   setSelectedBlockText(text);
  //   setActionMenuCoords(coords);
  //   setIsActionMenuVisible(true);
  // }
  // function onBlockDeselect() {
  //   setIsActionMenuVisible(false);
  // }

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
