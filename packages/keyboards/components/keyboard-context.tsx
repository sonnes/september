'use client';

import React, { ReactNode, createContext, useContext, useState } from 'react';

export type KeyboardType = 'qwerty' | 'circular' | 'none';

interface KeyboardContextType {
  isVisible: boolean;
  toggleVisibility: () => void;
  showKeyboard: () => void;
  hideKeyboard: () => void;
  keyboardType: KeyboardType;
  setKeyboardType: (type: KeyboardType) => void;
}

const KeyboardContext = createContext<KeyboardContextType | undefined>(undefined);

interface KeyboardProviderProps {
  defaultVisible?: boolean;
  defaultKeyboardType?: KeyboardType;
  children: ReactNode;
}

export function KeyboardProvider({
  defaultVisible = true,
  defaultKeyboardType = 'qwerty',
  children,
}: KeyboardProviderProps) {
  const [isVisible, setIsVisible] = useState(defaultVisible);
  const [keyboardType, setKeyboardType] = useState<KeyboardType>(defaultKeyboardType);

  const toggleVisibility = () => setIsVisible(prev => !prev);
  const showKeyboard = () => setIsVisible(true);
  const hideKeyboard = () => setIsVisible(false);

  return (
    <KeyboardContext.Provider
      value={{
        isVisible,
        toggleVisibility,
        showKeyboard,
        hideKeyboard,
        keyboardType,
        setKeyboardType,
      }}
    >
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

