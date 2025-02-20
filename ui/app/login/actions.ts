'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { z } from 'zod';

import { createClient } from '@/supabase/server';

const LoginSchema = z.object({
  email: z.string().email(),
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const isLocalEnv = process.env.NODE_ENV === 'development';
  const host = isLocalEnv ? siteUrl : `https://${siteUrl}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${host}/auth/callback?next=${next || '/app'}`,
    },
  });

  if (error) {
    return { success: false, message: error.message };
  }

  redirect(data.url);
}

export async function signInWithEmail(
  _: LoginResponse,
  formData: FormData
): Promise<LoginResponse> {
  const inputs = {
    email: formData.get('email') as string,
    next: formData.get('next') as string,
  };

  const { success, data, error: validationError } = LoginSchema.safeParse(inputs);

  if (!success) {
    return {
      success: false,
      message: '',
      inputs,
      errors: validationError.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: data.email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { success: false, message: error.message, inputs };
  }

  return {
    success: true,
    message: 'We sent you an email with instructions to login.',
    inputs,
  };
}
