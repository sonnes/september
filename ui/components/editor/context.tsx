import { createContext, useContext, useState } from 'react';

type EditorContextType = {
  text: string;
  setText: (text: string) => void;
  appendText: (text: string) => void;
  suggestions: string[];
  setSuggestions: (suggestions: string[]) => void;
  tone: string;
  setTone: (tone: string) => void;
};

const EditorContext = createContext<EditorContextType | null>(null);

export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [tone, setTone] = useState('neutral');

  const appendText = (text: string) => {
    setText(prevText => prevText + text);
  };

  return (
    <EditorContext.Provider
      value={{ text, setText, appendText, suggestions, setSuggestions, tone, setTone }}
    >
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
