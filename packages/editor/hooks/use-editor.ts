'use client';

import { useCallback, useState } from 'react';

import { tokenize } from '@/lib/autocomplete';

export function useEditorLogic(defaultText = '') {
  const [text, setText] = useState(defaultText);

  const addWord = useCallback((value: string) => {
    setText(prev => {
      if (prev.slice(-1) === ' ' || prev.length === 0) {
        return prev + value + ' ';
      }
      return prev + ' ' + value + ' ';
    });
  }, []);

  const setCurrentWord = useCallback((value: string) => {
    setText(prev => {
      if (prev.length === 0) {
        return value;
      }
      const tokens = tokenize(prev);
      const lastWord = tokens[tokens.length - 1] || '';
      return prev + value.slice(lastWord.length) + ' ';
    });
  }, []);

  const appendText = useCallback((value: string) => {
    setText(prev => prev + value + ' ');
  }, []);

  const reset = useCallback(() => {
    setText('');
  }, []);

  return {
    text,
    setText,
    addWord,
    setCurrentWord,
    appendText,
    reset,
  };
}
