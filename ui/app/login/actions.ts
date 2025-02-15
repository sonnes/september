'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { z } from 'zod';

import { createClient } from '@/supabase/server';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  next: z.string().optional(),
});

export type LoginFormData = z.infer<typeof LoginSchema>;

export type LoginResponse = {
  success: boolean;
  message: string;
  inputs?: LoginFormData;
  errors?: Record<string, string[]>;
};

export async function signInWithGoogle(next?: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${next || '/app'}`,
    },
  });

  if (error) {
    return { success: false, message: error.message };
  }

  redirect(data.url);
}

export async function signIn(_: LoginResponse, formData: FormData): Promise<LoginResponse> {
  const {
    success,
    data,
    error: validationError,
  } = LoginSchema.safeParse(Object.fromEntries(formData));

  if (!success) {
    return {
      success: false,
      message: '',
      inputs: data,
      errors: validationError.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { success: false, message: error.message, inputs: data };
  }

  revalidatePath('/login');
  redirect(data.next ?? '/app');
}
