'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { z } from 'zod';

import { createClient } from '@/supabase/server';

const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type SignUpFormData = z.infer<typeof SignUpSchema>;

export type SignUpResponse = {
  success: boolean;
  message: string;
  inputs?: SignUpFormData;
  errors?: Record<string, string[]>;
};

export async function signUp(_: SignUpResponse, formData: FormData): Promise<SignUpResponse> {
  const {
    success,
    data,
    error: validationError,
  } = SignUpSchema.safeParse(Object.fromEntries(formData));

  if (!success) {
    return {
      success: false,
      message: '',
      inputs: data,
      errors: validationError.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp(data).then(() => {
    return supabase.auth.signInWithPassword(data);
  });

  if (error) {
    return { success: false, message: error.message, inputs: data };
  }

  revalidatePath('/signup');
  redirect('/app');
}
