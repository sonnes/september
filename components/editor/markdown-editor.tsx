'use client';

import React from 'react';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { MarkdownEditorProps } from '@/types/editor';

const MarkdownEditor = ({ content, onContentChange }: MarkdownEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert focus:outline-none w-full',
      },
    },
  });

  return <EditorContent editor={editor} />;
};

export default MarkdownEditor;
