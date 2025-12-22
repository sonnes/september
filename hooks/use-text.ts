'use client';

import { useEffect, useState } from 'react';

import { tokenize } from '@/lib/autocomplete';

export function useText(defaultText = '') {
  const [text, setText] = useState(defaultText);

  const addWord = (value: string) => {
    // if the last character is a space, add the new word
    if (text.slice(-1) === ' ' || text.length === 0) {
      setText(prev => prev + value + ' ');
    } else {
      setText(prev => prev + ' ' + value + ' ');
    }
  };

  const setCurrentWord = (value: string) => {
    if (text.length === 0) {
      setText(value);
    } else {
      // remove the last word
      const tokens = tokenize(text);
      const lastWord = tokens[tokens.length - 1];

      setText(prev => prev + value.slice(lastWord.length) + ' ');
    }
  };

  const appendText = (value: string) => {
    setText(prev => prev + value + ' ');
  };

  const reset = () => {
    setText('');
  };

  return { text, setText, addWord, setCurrentWord, reset, appendText };
}
