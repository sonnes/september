'use client';

import React from 'react';

import { useKeyboardContext } from '@/components/context/keyboard-provider';

import { CircularKeyboard, QwertyKeyboard } from './index';

interface KeyboardRendererProps {
  className?: string;
}

export function KeyboardRenderer({ className = '' }: KeyboardRendererProps) {
  const { keyboardType } = useKeyboardContext();

  console.log('keyboardType', keyboardType);
  switch (keyboardType) {
    case 'qwerty':
      return <QwertyKeyboard className={className} />;
    case 'circular':
      return <CircularKeyboard className={className} />;
    default:
      return null;
  }
}
