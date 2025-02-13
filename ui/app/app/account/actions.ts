'use server';

import { z } from 'zod';

import { getAuthUser } from '@/app/actions/user';
import { createClient } from '@/supabase/server';
import type { Account } from '@/supabase/types';

const UpdateAccountSchema = z.object({
  id: z.string().optional(),
  first_name: z.string().max(100),
  last_name: z.string().max(100).optional(),
  city: z.string().max(100),
  country: z.string().max(100),
  contact_name: z.string().max(100).optional(),
  contact_email: z.string().email().optional(),
  primary_diagnosis: z.string().max(100),
  year_of_diagnosis: z.number(),
  medical_notes: z.string().max(1000).optional(),
  terms_accepted: z.boolean(),
  privacy_accepted: z.boolean(),
  document_id: z.string().optional(),
  document_file: z.instanceof(File).optional(),
  has_consent: z.boolean().optional(),
});

type UpdateAccountType = z.infer<typeof UpdateAccountSchema>;

export type UpdateAccountResponse = {
  success: boolean;
  message: string;
  inputs?: UpdateAccountType;
  errors?: Record<string, string[]>;
};

export async function updateAccount(
  _: UpdateAccountResponse,
  formData: FormData
): Promise<UpdateAccountResponse> {
  const user = await getAuthUser();

  if (!user) {
    throw new Error('User not found');
  }

  const validated = UpdateAccountSchema.safeParse(Object.fromEntries(formData));

  if (!validated.success) {
    return {
      success: false,
      message: validated.error.message,
      inputs: validated.data,
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const account = validated.data;

  account.id = user.id;
  account.has_consent =
    account.terms_accepted &&
    account.privacy_accepted &&
    account.document_id !== '' &&
    account.first_name !== '' &&
    account.last_name !== '';

  if (account.document_file) {
    const { id, error } = await uploadDocument(account.document_file);
    if (error) {
      throw new Error(error.message);
    }

    account.document_id = id;
  }

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

async function uploadDocument(file: File) {
  const supabase = await createClient();

  const { data, error } = await supabase.storage.from('documents').upload(file.name, file);

  return { id: data?.id, error: error };
}
