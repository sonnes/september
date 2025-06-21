'use client';

import React, { useEffect } from 'react';

import Typography from '@tiptap/extension-typography';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

import { markdownConfig } from '@/lib/tiptap/markdown-config';
import { ObsidianSyntaxHighlight } from '@/lib/tiptap/syntax-decorations';
import { MarkdownEditorProps } from '@/types/editor';

const MarkdownEditor = ({
  content,
  onContentChange,
  placeholder = 'Start writing...',
  className = '',
  editable = true,
  autoFocus = false,
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
      },
    },
  });

  // Handle content changes from props (for controlled component behavior)
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.storage.markdown.getMarkdown();
      if (currentContent !== content) {
        // Set content as markdown, which will be parsed by the extension
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  return <EditorContent editor={editor} />;
};

export default MarkdownEditor;
