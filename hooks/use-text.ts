import { useEffect, useState } from 'react';

import { tokenize } from '@/lib/transformer/text';

export function useText() {
  const [tokens, setTokens] = useState<string[]>([]);

  const [text, setText] = useState('');

  const addWord = (value: string) => {
    setTokens(prev => [...prev, value]);
  };

  const setCurrentWord = (value: string) => {
    if (tokens.length === 0) {
      setText(value);
    } else {
      // remove the last and add the new
      setText(tokens.slice(0, -1).join(' ') + ' ' + value);
    }
  };

  useEffect(() => {
    const tokens = tokenize(text);
    setTokens(tokens);
  }, [text]);

  const reset = () => {
    setTokens([]);
    setText('');
  };

  return { text, setText, addWord, setCurrentWord, reset };
}
