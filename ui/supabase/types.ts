import { Database } from '../types/supabase';

export type Message = Database['api']['Tables']['messages']['Row'];

export type Account = Database['api']['Tables']['accounts']['Row'];

export type UpdateAccount = Database['api']['Tables']['accounts']['Update'];
