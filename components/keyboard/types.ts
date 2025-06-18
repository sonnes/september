export type KeyboardType = 'circular' | 'emojis' | 'qwerty' | null;

export interface KeyboardProps {
  onKeyPress: (value: string) => void;
}
