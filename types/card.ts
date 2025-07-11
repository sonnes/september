import { Audio } from './audio';

export interface Card {
  id: string;
  text: string;
  rank: number;
  created_at: Date;
  deck_id?: string;
  audio?: Audio;
}

export interface Deck {
  id: string;
  name: string;
  created_at: Date;
  cards?: Card[];
}
