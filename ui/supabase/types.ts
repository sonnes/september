import { Database } from '../types/supabase';

export type Message = Database['api']['Tables']['messages']['Row'];

export type CreateUser = {
  email: string;
  password: string;
};
