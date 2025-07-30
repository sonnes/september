import { Audio } from './audio';

export interface Card {
  id: string;
  text: string;
  rank: number;
  created_at: Date;
  deck_id: string;
  user_id: string;
  audio_path?: string;
  audio?: Audio;
}

export type PartialCard = Partial<Card>;

export interface Deck {
  id: string;
  name: string;
  created_at: Date;
  user_id: string;
  cards?: Card[];
}

export type PartialDeck = Partial<Deck>;
