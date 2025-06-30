'use client';

import React, { useEffect, useRef, useState } from 'react';

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
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'loading';
    message: string;
  }>({
    visible: false,
    type: 'success',
    message: '',
  });

  // Real suggestion function using API
  const getSuggestion = async (previousText: string): Promise<string | null> => {
    setIsLoadingSuggestion(true);
    setStatusFeedback({ visible: true, type: 'loading', message: 'Getting suggestion...' });

    try {
      console.log('previousText', previousText);
      // Call the API with the required parameters
      const response = await fetch('/api/autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          previousText,
          cursorPosition: previousText.length, // cursor position at end of previous text
          documentContent: content || '', // document content
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const suggestion = data.suggestion;

      if (suggestion) {
        // Show brief success feedback
        setStatusFeedback({ visible: true, type: 'success', message: 'Suggestion ready' });
        setTimeout(() => {
          setStatusFeedback(prev => ({ ...prev, visible: false }));
        }, 2000);
      } else {
        // No suggestion available
        setStatusFeedback({ visible: false, type: 'success', message: '' });
      }

      return suggestion;
    } catch (error) {
      console.error('Error getting suggestion:', error);

      // Show error feedback
      setStatusFeedback({ visible: true, type: 'error', message: 'Failed to get suggestion' });
      setTimeout(() => {
        setStatusFeedback(prev => ({ ...prev, visible: false }));
      }, 3000);

      return null;
    } finally {
      setIsLoadingSuggestion(false);
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
        suggestionDebounce: 700, // Slightly faster response for better UX
        applySuggestionKey: 'Tab', // Standard key for accepting suggestions
        previousTextLength: 4000, // More context for better suggestions
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
        class: `prose prose-obsidian focus:outline-none w-full ${className}`,
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
    <div
      className={`relative w-full h-full autocomplete-editor-loading ${isLoadingSuggestion ? 'visible' : ''}`}
      role="textbox"
      aria-busy={isLoadingSuggestion}
      aria-label={isLoadingSuggestion ? 'Loading suggestion...' : undefined}
    >
      {/* Status feedback for autocomplete */}
      <div
        className={`autocomplete-status-feedback ${statusFeedback.visible ? 'visible' : ''} ${statusFeedback.type}`}
        aria-hidden="true"
        role="status"
        aria-live="polite"
      >
        {statusFeedback.type === 'loading' && (
          <span className="inline-flex items-center gap-1">
            <svg
              className="animate-spin -ml-1 mr-1 h-3 w-3 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {statusFeedback.message}
          </span>
        )}
        {statusFeedback.type !== 'loading' && statusFeedback.message}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
};

export default MarkdownEditor;
