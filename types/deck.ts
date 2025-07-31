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

export interface PutCardData {
  id: string;
  text: string;
  rank: number;
  deck_id: string;
  user_id: string;
  audio_path?: string;
}

export type PartialCard = Partial<Card>;

export interface Deck {
  id: string;
  name: string;
  created_at: Date;
  user_id: string;
  cards?: Card[];
}

export interface PutDeckData {
  id: string;
  name: string;
  user_id: string;
}

export type PartialDeck = Partial<Deck>;
