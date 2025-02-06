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

export type SignUpFormData = {
  email: string;
  password: string;
};

export type SignUpResponse = {
  success: boolean;
  message: string;
  inputs?: SignUpFormData;
};

export async function signUp(_: SignUpResponse, formData: FormData): Promise<SignUpResponse> {
  const supabase = await createClient();

  const data: SignUpFormData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    return { success: false, message: error.message, inputs: data };
  }

  return { success: true, message: 'Signed up successfully' };
}

// export type SignUpResponse = {
//   success: boolean;
//   message: string;
//   inputs?: {
//     name: string;
//     email: string;
//     password: string;
//     city: string;
//     country: string;
//     userType: string;
//     diagnosis: string;
//     yearOfDiagnosis: string;
//     termsAccepted: boolean;
//     privacyAccepted: boolean;
//   };
// };

// export async function signUp(
//   prevState: SignUpResponse,
//   formData: FormData
// ): Promise<SignUpResponse> {
//   try {
//     // Get form data
//     const inputs = {
//       name: formData.get('name') as string,
//       email: formData.get('email') as string,
//       password: formData.get('password') as string,
//       city: formData.get('city') as string,
//       country: formData.get('country') as string,
//       userType: formData.get('userType') as string,
//       diagnosis: formData.get('diagnosis') as string,
//       yearOfDiagnosis: formData.get('yearOfDiagnosis') as string,
//       termsAccepted: formData.get('termsAccepted') === 'on',
//       privacyAccepted: formData.get('privacyAccepted') === 'on',
//     };

//     // TODO: Add your signup logic here
//     // const { data, error } = await supabase.auth.signUp({
//     //   email: inputs.email,
//     //   password: inputs.password,
//     //   options: {
//     //     data: {
//     //       name: inputs.name,
//     //       city: inputs.city,
//     //       country: inputs.country,
//     //       // ... other fields
//     //     },
//     //   },
//     // });

//     // For now, simulate a successful signup
//     return {
//       success: true,
//       message: 'Account created successfully! Please check your email to verify your account.',
//       inputs,
//     };
//   } catch (error) {
//     return {
//       success: false,
//       message: error instanceof Error ? error.message : 'An error occurred during signup',
//     };
//   }
// }
