'use client';

import { ReactNode, createContext, useCallback, useContext, useState } from 'react';

import { tokenize } from '@/lib/autocomplete';

interface EditorContextValue {
  text: string;
  setText: (value: string | ((prev: string) => string)) => void;
  addWord: (value: string) => void;
  setCurrentWord: (value: string) => void;
  appendText: (value: string) => void;
  reset: () => void;
}

const EditorContext = createContext<EditorContextValue | undefined>(undefined);

interface EditorProviderProps {
  children: ReactNode;
  defaultText?: string;
}

export function EditorProvider({ children, defaultText = '' }: EditorProviderProps) {
  const [text, setText] = useState(defaultText);

  const addWord = useCallback((value: string) => {
    setText(prev => {
      if (prev.slice(-1) === ' ' || prev.length === 0) {
        return prev + value + ' ';
      }
      return prev + ' ' + value + ' ';
    });
  }, []);

  const setCurrentWord = useCallback((value: string) => {
    setText(prev => {
      if (prev.length === 0) {
        return value;
      }
      const tokens = tokenize(prev);
      const lastWord = tokens[tokens.length - 1];
      return prev + value.slice(lastWord.length) + ' ';
    });
  }, []);

  const appendText = useCallback((value: string) => {
    setText(prev => prev + value + ' ');
  }, []);

  const reset = useCallback(() => {
    setText('');
  }, []);

  return (
    <EditorContext.Provider
      value={{
        text,
        setText,
        addWord,
        setCurrentWord,
        appendText,
        reset,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorContext() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}
