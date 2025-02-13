'use server';

import { revalidatePath } from 'next/cache';

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
  contact_email: z.string().email().optional().or(z.literal('')),
  primary_diagnosis: z.string().max(100),
  year_of_diagnosis: z.number().min(1900).max(new Date().getFullYear()),
  medical_notes: z.string().max(1000).optional(),
  terms_accepted: z.boolean(),
  privacy_accepted: z.boolean(),
  document_path: z.string().optional(),
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

  const supabase = await createClient();

  const inputs = {
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

  const validated = UpdateAccountSchema.safeParse(inputs);

  if (!validated.success) {
    return {
      success: false,
      message: validated.error.message,
      inputs: inputs,
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const account = validated.data;
  account.id = user.id;

  // Handle document upload
  const documentFile = formData.get('document') as File;
  if (documentFile?.size > 0) {
    const fileName = `${user.id}/${Date.now()}-${documentFile.name}`;
    const { data, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, documentFile);

    if (uploadError) {
      return {
        success: false,
        message: 'Failed to upload document',
        inputs: account,
      };
    }

    account.document_path = data.path;
  }

  // Update consent status
  account.has_consent =
    account.terms_accepted &&
    account.privacy_accepted &&
    account.document_path !== '' &&
    account.first_name !== '';

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

export async function deleteDocument(path: string) {
  const user = await getAuthUser();

  if (!user) {
    throw new Error('User not found');
  }

  const supabase = await createClient();

  // Delete the file from storage
  const { error: deleteError } = await supabase.storage.from('documents').remove([path]);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  // Update account to remove document_id
  const { error: updateError } = await supabase
    .schema('api')
    .from('accounts')
    .update({ document_path: null })
    .eq('id', user.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath('/app/account');
}
