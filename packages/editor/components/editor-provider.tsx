'use client';

import { ReactNode, createContext, useContext } from 'react';

import { useEditorLogic } from '@/packages/editor/hooks/use-editor';
import { EditorContextValue } from '@/packages/editor/types';

const EditorContext = createContext<EditorContextValue | undefined>(undefined);

interface EditorProviderProps {
  children: ReactNode;
  defaultText?: string;
}

export function EditorProvider({ children, defaultText = '' }: EditorProviderProps) {
  const editorLogic = useEditorLogic(defaultText);

  return <EditorContext.Provider value={editorLogic}>{children}</EditorContext.Provider>;
}

export function useEditorContext() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}
