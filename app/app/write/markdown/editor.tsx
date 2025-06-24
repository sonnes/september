'use client';

import React, { useEffect, useRef, useState } from 'react';

import Heading from '@tiptap/extension-heading';
import ListItem from '@tiptap/extension-list-item';
import Paragraph from '@tiptap/extension-paragraph';
import Typography from '@tiptap/extension-typography';
import { EditorContent, ReactNodeViewRenderer, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { v4 as uuidv4 } from 'uuid';

import { createUserMessage } from '@/app/actions/messages';
import { markdownConfig } from '@/lib/tiptap/markdown-config';
import { ObsidianSyntaxHighlight } from '@/lib/tiptap/syntax-decorations';
import { MarkdownEditorProps } from '@/types/editor';

import BlockNodeView from './BlockNodeView';

const MarkdownEditor = ({
  content,
  onContentChange,
  placeholder = 'Start writing...',
  className = '',
  editable = true,
  autoFocus = false,
  ariaLabel,
}: MarkdownEditorProps) => {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  // Play handler for NodeView
  const handleBlockPlay = async (text: string) => {
    setLoadingKey(text);
    const id = uuidv4();
    try {
      const { audio } = await createUserMessage({
        id,
        text,
        type: 'message',
      });
      const audioUrl = `data:audio/mp3;base64,${audio.blob}`;
      const audioElement = new Audio(audioUrl);
      await audioElement.play();
    } catch (err) {
      console.error('Error generating or playing audio:', err);
    } finally {
      setLoadingKey(null);
    }
  };

  const editor = useEditor({
    extensions: [
      Paragraph.extend({
        addNodeView() {
          return ReactNodeViewRenderer(props => (
            <BlockNodeView {...props} onPlay={handleBlockPlay} loadingKey={loadingKey} />
          ));
        },
      }),
      Heading.extend({
        addNodeView() {
          return ReactNodeViewRenderer(props => (
            <BlockNodeView {...props} onPlay={handleBlockPlay} loadingKey={loadingKey} />
          ));
        },
      }),
      ListItem.extend({
        addNodeView() {
          return ReactNodeViewRenderer(props => (
            <BlockNodeView {...props} onPlay={handleBlockPlay} loadingKey={loadingKey} />
          ));
        },
      }),
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
