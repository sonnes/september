'use client';

import { ReactNode, createContext, useContext } from 'react';

import { useEditorLogic } from '../hooks/use-editor';
import { EditorContextValue } from '../types';

const EditorContext = createContext<EditorContextValue | undefined>(undefined);

interface EditorProviderProps {
  children: ReactNode;
  defaultText?: string;
  /** Optional chat id for per-recipient personalization. */
  chatId?: string;
}

export function EditorProvider({ children, defaultText = '', chatId }: EditorProviderProps) {
  const editorLogic = useEditorLogic(defaultText);

  return (
    <EditorContext.Provider value={{ ...editorLogic, chatId }}>{children}</EditorContext.Provider>
  );
}

export function useEditorContext() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditorContext must be used within an EditorProvider');
  }
  return context;
}
