export interface Audio {
  blob: string;
  alignment?: Alignment;
}

export interface Alignment {
  characters: string[];
  start_times: number[];
  end_times: number[];
}
