'use client';

import React, { useEffect, useRef, useState } from 'react';

import Typography from '@tiptap/extension-typography';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

import { markdownConfig } from '@/lib/tiptap/markdown-config';
import { ObsidianSyntaxHighlight } from '@/lib/tiptap/syntax-decorations';
import { MarkdownEditorProps } from '@/types/editor';

import ActionMenu from './action-menu';

const BLOCK_NODE_TYPES = ['paragraph', 'heading', 'listItem'];

const MarkdownEditor = ({
  content,
  onContentChange,
  placeholder = 'Start writing...',
  className = '',
  editable = true,
  autoFocus = false,
  ariaLabel,
}: MarkdownEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      Markdown.configure(markdownConfig),
      ObsidianSyntaxHighlight,
    ],
    content: content,
    editable,
    autofocus: autoFocus,
    onUpdate: ({ editor }) => {
      // Use markdown serialization instead of HTML
      const markdown = editor.storage.markdown.getMarkdown();
      onContentChange(markdown);
    },
    editorProps: {
      attributes: {
        class: `prose prose-obsidian dark:prose-invert focus:outline-none w-full ${className}`,
        'data-placeholder': placeholder,
        'aria-label': ariaLabel || placeholder,
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
  });

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [blockMenus, setBlockMenus] = useState<
    {
      key: string;
      text: string;
      top: number;
      left: number;
    }[]
  >([]);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!editor || !editor.view || !editorContainerRef.current) return;
    const blocks: { key: string; text: string; top: number; left: number }[] = [];
    const containerRect = editorContainerRef.current.getBoundingClientRect();
    editor.state.doc.descendants((node, pos) => {
      if (BLOCK_NODE_TYPES.includes(node.type.name)) {
        const dom = editor.view.nodeDOM(pos) as HTMLElement | null;
        if (dom) {
          const rect = dom.getBoundingClientRect();
          blocks.push({
            key: `${node.type.name}-${pos}`,
            text: node.textContent,
            top: rect.top - containerRect.top,
            left: rect.left - containerRect.left - 40, // 40px to the left
          });
        }
      }
    });
    setBlockMenus(blocks);
  }, [editor, content]);

  const handlePlay = (text: string, key: string) => {
    setLoadingKey(key);
    setTimeout(() => {
      console.log('Selected block text:', text);
      setLoadingKey(null);
    }, 300);
  };

  return (
    <div ref={editorContainerRef} className="relative w-full h-full">
      <EditorContent editor={editor} />
      {blockMenus.map(block => (
        <ActionMenu
          key={block.key}
          top={block.top}
          left={block.left}
          onPlay={() => handlePlay(block.text, block.key)}
          isLoading={loadingKey === block.key}
        />
      ))}
    </div>
  );
};

export default MarkdownEditor;
