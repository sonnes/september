export interface EditorContextValue {
  text: string;
  setText: (value: string | ((prev: string) => string)) => void;
  addWord: (value: string) => void;
  setCurrentWord: (value: string) => void;
  appendText: (value: string) => void;
  reset: () => void;
}
