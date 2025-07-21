'use client';

import React, { ReactNode, createContext, useContext, useState } from 'react';

interface TextContextType {
  text: string;
  setText: (value: string) => void;
  addWord: (value: string) => void;
  completeWord: (value: string) => void;
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

  const completeWord = (value: string) => {
    // replace the last word with the value
    setText(prev => prev.replace(/\s\w+$/, ' ' + value + ' '));
  };

  return (
    <TextContext.Provider value={{ text, setText, addWord, completeWord }}>
      {children}
    </TextContext.Provider>
  );
}

export function useTextContext() {
  const ctx = useContext(TextContext);
  if (!ctx) throw new Error('useTextContext must be used within a TextProvider');
  return ctx;
}
