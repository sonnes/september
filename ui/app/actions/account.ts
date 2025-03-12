'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/supabase/server';
import { Account } from '@/supabase/types';

import { getAuthUser } from './user';

export async function getAccount() {
  const user = await getAuthUser();

  if (!user) {
    throw new Error('User not found');
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .schema('api')
    .from('accounts')
    .select('*')
    .eq('id', user.id)
    .single<Account>();

  if (error) {
    if (error.code === 'PGRST116') {
      return {
        id: user.id,
      } as Account;
    }

    throw new Error(error.message);
  }

  return data;
}

export async function setVoiceId(voiceId: string) {
  const user = await getAuthUser();

  if (!user) {
    throw new Error('User not found');
  }

  const supabase = await createClient();

  const { error } = await supabase
    .schema('api')
    .from('accounts')
    .update({ voice_id: voiceId })
    .eq('id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/app/voices');
}
