'use client';

import { ReactNode, createContext, useContext } from 'react';

import { useEditorLogic } from '../hooks/use-editor';
import { EditorContextValue } from '../types';

const EditorContext = createContext<EditorContextValue | undefined>(undefined);

interface EditorProviderProps {
  children: ReactNode;
  defaultText?: string;
  /** Optional space id for per-recipient personalization. */
  spaceId?: string;
}

export function EditorProvider({ children, defaultText = '', spaceId }: EditorProviderProps) {
  const editorLogic = useEditorLogic(defaultText);

  return (
    <EditorContext.Provider value={{ ...editorLogic, spaceId }}>{children}</EditorContext.Provider>
  );
}

export function useEditorContext() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditorContext must be used within an EditorProvider');
  }
  return context;
}
