export type KeyboardType = 'abc' | 'numbers' | 'symbols' | 'emojis' | 'qwerty' | null;

export interface KeyboardProps {
  onKeyPress: (value: string) => void;
}
