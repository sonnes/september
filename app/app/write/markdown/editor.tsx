'use client';

import React, { useEffect, useRef } from 'react';

import Heading from '@tiptap/extension-heading';
import ListItem from '@tiptap/extension-list-item';
import Typography from '@tiptap/extension-typography';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { v4 as uuidv4 } from 'uuid';

import { getAutocompleteSuggestions } from '@/app/actions/suggestions';
import { markdownConfig } from '@/lib/tiptap/markdown-config';
import { ObsidianSyntaxHighlight } from '@/lib/tiptap/syntax-decorations';
import { MarkdownEditorProps } from '@/types/editor';

import { AutocompleteExtension } from './autocomplete-extension';
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
  // Real suggestion function using server action
  const getSuggestion = async (previousText: string): Promise<string | null> => {
    try {
      console.log('previousText', previousText);
      // Call the server action with the required parameters
      const suggestion = await getAutocompleteSuggestions(
        previousText,
        previousText.length, // cursor position at end of previous text
        content || '' // document content
      );

      return suggestion;
    } catch (error) {
      console.error('Error getting suggestion:', error);
      return null;
    }
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      ParagraphPlayExtension,
      StarterKit,
      Typography,
      Markdown.configure(markdownConfig),
      ObsidianSyntaxHighlight,
      AutocompleteExtension.configure({
        getSuggestion: getSuggestion,
        suggestionDebounce: 2000, // Slightly faster response for better UX
        applySuggestionKey: 'Tab', // Standard key for accepting suggestions
        previousTextLength: 1000, // More context for better suggestions
      }),
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
        spellcheck: 'true',
        autocomplete: 'on',
        autocorrect: 'on',
        autocapitalize: 'sentences',
        'data-gramm': 'true', // Enable Grammarly if installed
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
