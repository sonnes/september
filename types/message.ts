import { Database } from './supabase';

export type Message = Database['api']['Tables']['messages']['Row'];
