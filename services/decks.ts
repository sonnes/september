import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

import { Card, Deck } from '@/types/card';

interface CreateDeckData {
  id?: string;
  name: string;
  user_id: string;
}

interface CreateCardData {
  id?: string;
  text: string;
  rank?: number;
  deck_id: string;
  user_id: string;
  audio_path?: string;
}

class DecksService {
  private supabase: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.supabase = client;
  }

  async createDeck(deck: CreateDeckData): Promise<Deck> {
    const { data, error } = await this.supabase
      .from('decks')
      .insert({
        id: deck.id || uuidv4(),
        name: deck.name,
        user_id: deck.user_id,
      })
      .select()
      .single();
    if (error) {
      throw error;
    }

    return data;
  }

  async updateDeck(deckId: string, updates: Partial<Pick<Deck, 'name'>>): Promise<Deck> {
    const { data, error } = await this.supabase
      .from('decks')
      .update(updates)
      .eq('id', deckId)
      .select()
      .single();
    if (error) {
      throw error;
    }

    return data;
  }

  async deleteDeck(deckId: string): Promise<void> {
    const { error } = await this.supabase.from('decks').delete().eq('id', deckId);
    if (error) {
      throw error;
    }
  }

  async getDecks(user_id: string): Promise<Deck[]> {
    const { data, error } = await this.supabase
      .from('decks')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async getDeck(deckId: string): Promise<Deck | null> {
    const { data, error } = await this.supabase.from('decks').select('*').eq('id', deckId).single();
    if (error) throw error;
    return data;
  }

  async createCard(card: CreateCardData): Promise<Card> {
    const { data, error } = await this.supabase
      .from('cards')
      .insert({
        id: card.id || uuidv4(),
        text: card.text,
        rank: card.rank || 0,
        deck_id: card.deck_id,
        user_id: card.user_id,
        audio_path: card.audio_path,
      })
      .select()
      .single();
    if (error) {
      throw error;
    }

    return data;
  }

  async updateCard(
    cardId: string,
    updates: Partial<Pick<Card, 'text' | 'rank' | 'audio_path'>>
  ): Promise<Card> {
    const { data, error } = await this.supabase
      .from('cards')
      .update(updates)
      .eq('id', cardId)
      .select()
      .single();
    if (error) {
      throw error;
    }

    return data;
  }

  async deleteCard(cardId: string): Promise<void> {
    const { error } = await this.supabase.from('cards').delete().eq('id', cardId);
    if (error) {
      throw error;
    }
  }

  async getCards(deckId: string): Promise<Card[]> {
    const { data, error } = await this.supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('rank', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async getCard(cardId: string): Promise<Card | null> {
    const { data, error } = await this.supabase.from('cards').select('*').eq('id', cardId).single();
    if (error) throw error;
    return data;
  }

  async getDeckWithCards(deckId: string): Promise<(Deck & { cards: Card[] }) | null> {
    const { data, error } = await this.supabase
      .from('decks')
      .select(
        `
        *,
        cards (*)
      `
      )
      .eq('id', deckId)
      .single();
    if (error) throw error;
    return data;
  }
}

export default DecksService;
