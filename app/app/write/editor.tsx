'use client';

import { useEffect, useState } from 'react';

import MarkdownEditor from '@/app/app/write/markdown/editor';

const STORAGE_KEY = 'markdown-editor-content';
const DEFAULT_CONTENT = 'Welcome to your markdown editor\n\nHappy writing! 🚀';

export default function Editor() {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load content from localStorage on component mount
  useEffect(() => {
    try {
      const savedContent = localStorage.getItem(STORAGE_KEY);
      if (savedContent !== null) {
        setContent(savedContent);
      }
    } catch (error) {
      console.warn('Failed to load content from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, newContent);
    } catch (error) {
      console.warn('Failed to save content to localStorage:', error);
    }
  };

  // Don't render the editor until we've loaded the initial content
  if (!isLoaded) {
    return (
      <div className="relative p-2 md:p-4 bg-white rounded-lg shadow-xs ring-1 ring-zinc-950/5 h-full flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative p-2 md:p-4 bg-white rounded-lg shadow-xs ring-1 ring-zinc-950/5">
      <MarkdownEditor
        content={content}
        onContentChange={handleContentChange}
        ariaLabel="Markdown editor"
      />
    </div>
  );
}
