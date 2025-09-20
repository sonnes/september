'use client';

import React, { ReactNode, createContext, useContext, useState } from 'react';

export type KeyboardType = 'qwerty' | 'circular' | 'none';

interface KeyboardContextType {
  keyboardType: KeyboardType;
  setKeyboardType: (type: KeyboardType) => void;
}

const KeyboardContext = createContext<KeyboardContextType | undefined>(undefined);

export function KeyboardProvider({
  defaultKeyboardType = 'qwerty',
  children,
}: {
  defaultKeyboardType?: KeyboardType;
  children: ReactNode;
}) {
  const [keyboardType, setKeyboardType] = useState<KeyboardType>(defaultKeyboardType);

  return (
    <KeyboardContext.Provider value={{ keyboardType, setKeyboardType }}>
      {children}
    </KeyboardContext.Provider>
  );
}

export function useKeyboardContext() {
  const context = useContext(KeyboardContext);
  if (context === undefined) {
    throw new Error('useKeyboardContext must be used within a KeyboardProvider');
  }
  return context;
}
