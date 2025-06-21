import { useCallback, useEffect, useState } from 'react';

import Typography from '@tiptap/extension-typography';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

import { markdownConfig } from '@/lib/tiptap/markdown-config';
import { MarkdownEditorHookProps, MarkdownEditorHookReturn } from '@/types/editor';

import { useDebounce } from './useDebounce';

export const useMarkdownEditor = ({
  initialContent = '',
  onContentChange,
  placeholder = 'Start writing...',
  editable = true,
  autoFocus = false,
  debounceMs = 500,
}: MarkdownEditorHookProps = {}): MarkdownEditorHookReturn => {
  const [content, setContent] = useState(initialContent);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Debounce content changes to prevent excessive updates
  const debouncedContent = useDebounce(content, debounceMs);

  const editor = useEditor({
    extensions: [StarterKit, Typography, Markdown.configure(markdownConfig)],
    content: initialContent,
    editable,
    autofocus: autoFocus,
    onCreate: () => {
      setIsLoading(false);
    },
    onUpdate: ({ editor }) => {
      const markdown = editor.storage.markdown.getMarkdown();
      setContent(markdown);
      setHasUnsavedChanges(true);
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert focus:outline-none w-full min-h-[200px]',
        'data-placeholder': placeholder,
      },
    },
  });

  // Handle debounced content changes
  useEffect(() => {
    if (debouncedContent !== initialContent && hasUnsavedChanges) {
      onContentChange?.(debouncedContent);
      setHasUnsavedChanges(false);
    }
  }, [debouncedContent, onContentChange, initialContent, hasUnsavedChanges]);

  // Handle external content updates
  useEffect(() => {
    if (editor && initialContent !== content) {
      const currentContent = editor.storage.markdown.getMarkdown();
      if (currentContent !== initialContent) {
        editor.commands.setContent(initialContent);
        setContent(initialContent);
        setHasUnsavedChanges(false);
      }
    }
  }, [editor, initialContent, content]);

  const getMarkdown = useCallback(() => {
    return editor?.storage.markdown.getMarkdown() || '';
  }, [editor]);

  const setMarkdown = useCallback(
    (markdown: string) => {
      if (editor) {
        editor.commands.setContent(markdown);
        setContent(markdown);
        setHasUnsavedChanges(false);
      }
    },
    [editor]
  );

  const clearContent = useCallback(() => {
    if (editor) {
      editor.commands.clearContent();
      setContent('');
      setHasUnsavedChanges(false);
    }
  }, [editor]);

  const focus = useCallback(() => {
    editor?.commands.focus();
  }, [editor]);

  const blur = useCallback(() => {
    editor?.commands.blur();
  }, [editor]);

  return {
    editor,
    content,
    isLoading,
    hasUnsavedChanges,
    getMarkdown,
    setMarkdown,
    clearContent,
    focus,
    blur,
  };
};
