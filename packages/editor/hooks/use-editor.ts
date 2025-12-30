'use client';

import { useCallback, useRef, useState } from 'react';

import { tokenize } from '@/lib/autocomplete';
import { EditorStats } from '@/packages/editor/types';

export function useEditorLogic(defaultText = '') {
  const [text, setText] = useState(defaultText);
  const statsRef = useRef<EditorStats>({ keysTyped: 0, charsSaved: 0 });

  const trackKeystroke = useCallback(() => {
    statsRef.current.keysTyped += 1;
  }, []);

  const trackCharsSaved = useCallback((chars: number) => {
    statsRef.current.charsSaved += Math.max(0, chars);
  }, []);

  const getAndResetStats = useCallback(() => {
    const stats = { ...statsRef.current };
    statsRef.current = { keysTyped: 0, charsSaved: 0 };
    return stats;
  }, []);

  const addWord = useCallback((value: string) => {
    trackCharsSaved(value.length);
    setText(prev => {
      if (prev.slice(-1) === ' ' || prev.length === 0) {
        return prev + value + ' ';
      }
      return prev + ' ' + value + ' ';
    });
  }, [trackCharsSaved]);

  const setCurrentWord = useCallback((value: string) => {
    setText(prev => {
      if (prev.length === 0) {
        trackCharsSaved(value.length);
        return value;
      }
      const tokens = tokenize(prev);
      const lastWord = tokens[tokens.length - 1] || '';
      const charsSavedCount = Math.max(0, value.length - lastWord.length);
      trackCharsSaved(charsSavedCount);
      return prev + value.slice(lastWord.length) + ' ';
    });
  }, [trackCharsSaved]);

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
    trackKeystroke,
    getAndResetStats,
  };
}
