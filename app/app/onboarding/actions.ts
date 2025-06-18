'use server';

import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { getAuthUser } from '@/app/actions/user';
import { createClient } from '@/supabase/server';

const OnboardingSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  primary_diagnosis: z.string().min(1, 'Primary diagnosis is required'),
  year_of_diagnosis: z.number().min(1900).max(new Date().getFullYear()),
  medical_notes: z.string().optional(),
  terms_accepted: z.boolean(),
  privacy_accepted: z.boolean(),
  document_path: z.string().optional(),
});

type OnboardingType = z.infer<typeof OnboardingSchema>;

export type OnboardingResponse = {
  success: boolean;
  message: string;
  inputs: {
    name: string;
    primary_diagnosis: string;
    year_of_diagnosis: number;
    medical_notes: string;
    terms_accepted: boolean;
    privacy_accepted: boolean;
    document_path: string;
  };
  errors?: Record<string, string[]>;
};

export async function updateOnboarding(
  _: OnboardingResponse,
  formData: FormData
): Promise<OnboardingResponse> {
  const user = await getAuthUser();

  if (!user) {
    throw new Error('User not found');
  }

  const supabase = await createClient();

  const inputs = {
    name: formData.get('name') as string,
    primary_diagnosis: formData.get('primary_diagnosis') as string,
    year_of_diagnosis: parseInt(formData.get('year_of_diagnosis') as string),
    medical_notes: formData.get('medical_notes') as string,
    terms_accepted: formData.get('terms_accepted') === 'on',
    privacy_accepted: formData.get('privacy_accepted') === 'on',
    document_path: formData.get('document_path') as string,
  };

  const validated = OnboardingSchema.safeParse(inputs);

  if (!validated.success) {
    return {
      success: false,
      message: validated.error.message,
      inputs,
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const onboarding_completed =
    inputs.name &&
    inputs.primary_diagnosis &&
    inputs.year_of_diagnosis &&
    inputs.terms_accepted &&
    inputs.privacy_accepted &&
    (inputs.document_path?.length ?? 0) > 0;

  const { error } = await supabase.schema('api').from('accounts').upsert({
    id: user.id,
    name: inputs.name,
    primary_diagnosis: inputs.primary_diagnosis,
    year_of_diagnosis: inputs.year_of_diagnosis,
    medical_notes: inputs.medical_notes,
    terms_accepted: inputs.terms_accepted,
    privacy_accepted: inputs.privacy_accepted,
    document_path: inputs.document_path,
    onboarding_completed: onboarding_completed,
  });

  if (error) {
    return {
      success: false,
      message: error.message,
      inputs,
    };
  }

  revalidatePath('/app/onboarding');

  return {
    success: true,
    message: onboarding_completed
      ? 'Onboarding completed successfully'
      : 'Account updated successfully',
    inputs,
  };
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

  revalidatePath('/app');
}
