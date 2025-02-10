'use server';

import { getAuthUser } from '@/app/actions/user';
import { createClient } from '@/supabase/server';
import type { Message } from '@/supabase/types';

export async function getMessages() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .schema('api')
    .from('messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .returns<Message[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createMessage({
  text,
  type,
  id,
}: {
  text: string;
  type: string;
  id: string;
}) {
  const user = await getAuthUser();
  if (!user) {
    return [];
  }

  const message = {
    text,
    type,
    user_id: user.id,
    id,
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .schema('api')
    .from('messages')
    .insert(message)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
