export type GridButtonType = 'default' | 'tag' | 'grid';

export interface GridButton {
  id: string;
  text: string;
  tags: string[];
  type: GridButtonType;
  image_url?: string;
  score?: number;
}

export interface Grid {
  id: string;
  name: string;
  buttons: GridButton[];
}
