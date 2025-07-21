'use client';

import React, { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';

interface TextContextType {
  text: string;
  debouncedText: string;
  setText: (value: string) => void;
  addWord: (value: string) => void;
  completeWord: (value: string) => void;
}

const TextContext = createContext<TextContextType | undefined>(undefined);

export function TextProvider({
  debounceMs = 300,
  children,
}: {
  debounceMs?: number;
  children: ReactNode;
}) {
  const [text, setText] = useState('');
  const [debouncedText, setDebouncedText] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setDebouncedText(text);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [text]);

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
    <TextContext.Provider value={{ text, debouncedText, setText, addWord, completeWord }}>
      {children}
    </TextContext.Provider>
  );
}

export function useTextContext() {
  const ctx = useContext(TextContext);
  if (!ctx) throw new Error('useTextContext must be used within a TextProvider');
  return ctx;
}
