'use client';

import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface TextContextType {
  text: string;
  setText: (value: string) => void;
  addWord: (value: string) => void;
  type: (value: string) => void;
  reset: () => void;
}

const TextContext = createContext<TextContextType | undefined>(undefined);

export function TextProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  const [text, setText] = useState('');

  const addWord = (value: string) => {
    setCurrentWord('');
    setStack(prev => [...prev, value]);
  };

  const type = (value: string) => {
    if (value === ' ') {
      setStack(prev => [...prev, currentWord]);
      setCurrentWord('');
    } else {
      setCurrentWord(prev => prev + value);
    }
  };

  useEffect(() => {
    setText(stack.join(' ') + ' ' + currentWord);
  }, [stack, currentWord]);

  const reset = () => {
    setStack([]);
    setCurrentWord('');
    setText('');
  };

  return (
    <TextContext.Provider value={{ text, setText, addWord, type, reset }}>
      {children}
    </TextContext.Provider>
  );
}

export function useTextContext() {
  const ctx = useContext(TextContext);
  if (!ctx) throw new Error('useTextContext must be used within a TextProvider');
  return ctx;
}
