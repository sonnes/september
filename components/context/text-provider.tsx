'use client';

import React, { ReactNode, createContext, useContext } from 'react';

import { useText } from '@/hooks/use-text';

interface TextContextType {
  text: string;
  setText: (value: string) => void;
  addWord: (value: string) => void;
  setCurrentWord: (value: string) => void;
  appendText: (value: string) => void;
  reset: () => void;
}

const TextContext = createContext<TextContextType | undefined>(undefined);

export function TextProvider({ children }: { children: ReactNode }) {
  const value = useText();

  return <TextContext.Provider value={value}>{children}</TextContext.Provider>;
}

export function useTextContext() {
  const ctx = useContext(TextContext);
  if (!ctx) throw new Error('useTextContext must be used within a TextProvider');
  return ctx;
}
