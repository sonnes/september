'use client';

import React, { useEffect, useRef } from 'react';

import Heading from '@tiptap/extension-heading';
import ListItem from '@tiptap/extension-list-item';
import Typography from '@tiptap/extension-typography';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { v4 as uuidv4 } from 'uuid';

import { markdownConfig } from '@/lib/tiptap/markdown-config';
import { ObsidianSyntaxHighlight } from '@/lib/tiptap/syntax-decorations';
import { MarkdownEditorProps } from '@/types/editor';

import ParagraphPlayExtension from './paragraph-play-extension';

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
      ParagraphPlayExtension,
      Heading,
      ListItem,
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

  return (
    <div className="relative w-full h-full">
      <EditorContent editor={editor} />
    </div>
  );
};

export default MarkdownEditor;
