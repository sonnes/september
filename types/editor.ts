import { type Editor } from '@tiptap/react';

export interface MarkdownEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

export interface EditorState {
  editor: Editor | null;
}
