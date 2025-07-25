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
    setText(prev => {
      // If text is empty, just set the value
      if (prev.trim() === '') {
        return value + ' ';
      }

      // Find the last word boundary (space or start of string)
      const lastSpaceIndex = prev.lastIndexOf(' ');

      if (lastSpaceIndex === -1) {
        // No spaces found, replace the entire text
        return value + ' ';
      } else {
        // Replace from the last space onwards
        return prev.substring(0, lastSpaceIndex + 1) + value + ' ';
      }
    });
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
