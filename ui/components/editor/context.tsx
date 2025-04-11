import { createContext, useContext, useState } from 'react';

type EditorContextType = {
  text: string;
  setText: (text: string) => void;
  appendText: (text: string) => void;
  tone: string;
  setTone: (tone: string) => void;
};

const EditorContext = createContext<EditorContextType | null>(null);

export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [text, setText] = useState('');
  const [tone, setTone] = useState('neutral');

  const appendText = (token: string) => {
    if (text === '') {
      setText(token + ' ');
      return;
    }

    const lastChar = text[text.length - 1];
    const lastCharIsPunctuation = /[.!?]/.test(lastChar);
    const lastCharIsSpace = lastChar === ' ';

    if (lastCharIsPunctuation || lastCharIsSpace) {
      setText(prevText => prevText + token + ' ');
      return;
    }

    // Get the last word in the text
    const words = text.split(' ');
    const lastWord = words[words.length - 1];

    // Check if the last word matches the token prefix
    if (lastWord && token.toLowerCase().startsWith(lastWord.toLowerCase())) {
      // Replace the last word with the token
      words[words.length - 1] = token;
      setText(words.join(' ') + ' ');
    } else {
      // Insert the token as is
      setText(prevText => prevText + ' ' + token + ' ');
    }
  };

  return (
    <EditorContext.Provider value={{ text, setText, appendText, tone, setTone }}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
