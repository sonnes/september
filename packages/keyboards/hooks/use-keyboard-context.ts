'use client';

import { useContext } from 'react';
import { KeyboardContext } from '@/packages/keyboards/components/keyboard-context';

export function useKeyboardContext() {
  const context = useContext(KeyboardContext);
  if (context === undefined) {
    throw new Error('useKeyboardContext must be used within a KeyboardProvider');
  }
  return context;
}
