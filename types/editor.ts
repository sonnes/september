import { type Editor } from '@tiptap/react';

export interface MarkdownEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
}

export interface EditorState {
  editor: Editor | null;
  isLoading?: boolean;
  hasUnsavedChanges?: boolean;
}

export interface MarkdownEditorHookProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  autoFocus?: boolean;
  debounceMs?: number;
}

export interface MarkdownEditorHookReturn {
  editor: Editor | null;
  content: string;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  getMarkdown: () => string;
  setMarkdown: (markdown: string) => void;
  clearContent: () => void;
  focus: () => void;
  blur: () => void;
}
