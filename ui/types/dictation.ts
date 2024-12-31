export interface Dictation {
  id: string;
  digits: number;
  speed: string;
  numbers: number;
  questions: DictationQuestion[];
  createdAt: Date;
}

export interface DictationQuestion {
  numbers: number[];
  answer: number;
  audio?: string;
}
