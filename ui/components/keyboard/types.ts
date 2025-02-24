export type KeyboardType = 'abc' | 'numbers' | 'symbols' | 'emojis' | null;

export interface KeyboardProps {
  onKeyPress: (value: string) => void;
}
