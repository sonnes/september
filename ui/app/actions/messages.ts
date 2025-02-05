import { createClient } from '@/supabase/server';
import type { Message } from '@/supabase/types';

export async function getMessages() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema('api')
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<Message[]>();

  if (error) {
    throw error;
  }

  return data;
}
