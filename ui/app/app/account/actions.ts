'use server';

import { getAuthUser } from '@/app/actions/user';
import { createClient } from '@/supabase/server';
import type { Account, UpdateAccount } from '@/supabase/types';

export type UpdateAccountResponse = {
  success: boolean;
  message: string;
  inputs: UpdateAccount;
};

export async function updateAccount(
  _: UpdateAccountResponse,
  formData: FormData
): Promise<UpdateAccountResponse> {
  const user = await getAuthUser();

  if (!user) {
    throw new Error('User not found');
  }

  const account = {
    id: user.id,
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    city: formData.get('city') as string,
    country: formData.get('country') as string,
    contact_name: formData.get('contact_name') as string,
    contact_email: formData.get('contact_email') as string,
    primary_diagnosis: formData.get('primary_diagnosis') as string,
    year_of_diagnosis: parseInt(formData.get('year_of_diagnosis') as string),
    medical_notes: formData.get('medical_notes') as string,
    terms_accepted: formData.get('terms_accepted') === 'on',
    privacy_accepted: formData.get('privacy_accepted') === 'on',
  };

  const supabase = await createClient();

  const { error } = await supabase.schema('api').from('accounts').upsert(account);

  if (error) {
    return {
      success: false,
      message: error.message,
      inputs: account,
    };
  }

  return {
    success: true,
    message: 'Account updated successfully',
    inputs: account,
  };
}

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
