export type KeyboardType = 'abc' | 'numbers' | 'symbols' | null;

export interface KeyboardProps {
  onKeyPress: (value: string) => void;
}
