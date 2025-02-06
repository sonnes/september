'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/supabase/server';

export const getAuthUser = async () => {
  const supabase = await createClient();
  try {
    const { data } = await supabase.auth.getUser();
    const { user } = data;
    return user;
  } catch {
    return undefined;
  }
};

export type LoginFormData = {
  email: string;
  password: string;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  inputs?: LoginFormData;
};

export async function signIn(_: LoginResponse, formData: FormData): Promise<LoginResponse> {
  const supabase = await createClient();

  const data: LoginFormData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { success: false, message: error.message, inputs: data };
  }

  revalidatePath('/', 'layout');

  return { success: true, message: 'Signed in successfully' };
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    throw error;
  }

  revalidatePath('/', 'layout');
  redirect('/');
}
