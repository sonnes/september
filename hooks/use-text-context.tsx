'use client';

import React, { ReactNode, createContext, useContext, useState } from 'react';

interface TextContextType {
  text: string;
  setText: (value: string) => void;
  addWord: (value: string) => void;
}

const TextContext = createContext<TextContextType | undefined>(undefined);

export function TextProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState('');

  const addWord = (value: string) => {
    //capitalize value based on the last word, full stop.
    if (text === '') {
      setText(value);
    } else if (text.endsWith('.')) {
      setText(prev => prev + ' ' + value);
    } else {
      setText(prev => prev + ' ' + value.toLowerCase());
    }
  };

  return <TextContext.Provider value={{ text, setText, addWord }}>{children}</TextContext.Provider>;
}

export function useTextContext() {
  const ctx = useContext(TextContext);
  if (!ctx) throw new Error('useTextContext must be used within a TextProvider');
  return ctx;
}
