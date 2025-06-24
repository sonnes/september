'use server';

import { revalidatePath } from 'next/cache';

import { getAuthUser } from '@/app/actions/user';
import { createClient } from '@/supabase/server';
import type { Message } from '@/supabase/types';
import { SpeechSettings } from '@/types/speech';

import { createSpeech } from './speech';

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

interface CreateMessageParams {
  id: string;
  text: string;
  type: string;
  tone?: string;
  previous_text?: string;
  settings?: SpeechSettings;
}

export async function createUserMessage(newMessage: CreateMessageParams) {
  const [audio, message] = await Promise.all([createSpeech(newMessage), createMessage(newMessage)]);

  return {
    ...message,
    audio,
  };
}

export async function createMessage({ id, text, type }: CreateMessageParams) {
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

  revalidatePath('/app/talk');

  return data;
}
