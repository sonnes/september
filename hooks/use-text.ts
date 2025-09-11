import { useEffect, useState } from 'react';

import { tokenize } from '@/lib/autocomplete';

export function useText() {
  const [text, setText] = useState('');

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
      console.log('setting text', value);
      setText(value);
    } else {
      // remove the last word
      const tokens = tokenize(text);
      const lastWord = tokens[tokens.length - 1];
      console.log('last word', lastWord);
      console.log('value', value);
      setText(prev => prev + value.slice(lastWord.length) + ' ');
    }
  };

  const reset = () => {
    setText('');
  };

  return { text, setText, addWord, setCurrentWord, reset };
}
