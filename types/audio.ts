export interface Audio {
  path?: string;
  blob?: string;
  alignment?: Alignment;
  duration?: number;
}

export interface Alignment {
  characters: string[];
  start_times: number[];
  end_times: number[];
}
