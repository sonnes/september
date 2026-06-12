export interface Audio {
  id?: string;
  text?: string;
  path?: string;
  blob?: string;
  alignment?: Alignment;
  duration?: number;
  utterance?: SpeechSynthesisUtterance;
}

export interface Alignment {
  characters: string[];
  start_times: number[];
  end_times: number[];
}
