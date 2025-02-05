import { Database } from '../types/supabase';

export type Message = Database['api']['Tables']['messages']['Row'];
