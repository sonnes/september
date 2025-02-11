'use server';

import { createServerClient } from '@/supabase/server';

export async function createAccount(prevState: any, formData: FormData) {
  const supabase = createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return {
      success: false,
      message: 'You must be logged in',
      inputs: Object.fromEntries(formData),
    };
  }

  const terms_accepted = formData.get('terms_accepted') === 'on';
  const privacy_accepted = formData.get('privacy_accepted') === 'on';

  const { error } = await supabase.from('accounts').insert({
    id: session.user.id,
    terms_accepted,
    privacy_accepted,
  });

  if (error) {
    return {
      success: false,
      message: error.message,
      inputs: { terms_accepted, privacy_accepted },
    };
  }

  return {
    success: true,
    message: 'Account created successfully',
    inputs: { terms_accepted, privacy_accepted },
  };
}

export async function updatePersonalInfo(prevState: any, formData: FormData) {
  const supabase = createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return {
      success: false,
      message: 'You must be logged in',
      inputs: Object.fromEntries(formData),
    };
  }

  const { error } = await supabase
    .from('accounts')
    .update({
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      city: formData.get('city'),
      country: formData.get('country'),
      contact_name: formData.get('contact_name'),
      contact_email: formData.get('contact_email'),
    })
    .eq('id', session.user.id);

  if (error) {
    return {
      success: false,
      message: error.message,
      inputs: Object.fromEntries(formData),
    };
  }

  return {
    success: true,
    message: 'Personal information updated successfully',
    inputs: Object.fromEntries(formData),
  };
}

export async function updateMedicalInfo(prevState: any, formData: FormData) {
  const supabase = createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return {
      success: false,
      message: 'You must be logged in',
      inputs: Object.fromEntries(formData),
    };
  }

  const { error } = await supabase
    .from('accounts')
    .update({
      primary_diagnosis: formData.get('primary_diagnosis'),
      year_of_diagnosis: parseInt(formData.get('year_of_diagnosis') as string),
    })
    .eq('id', session.user.id);

  if (error) {
    return {
      success: false,
      message: error.message,
      inputs: Object.fromEntries(formData),
    };
  }

  return {
    success: true,
    message: 'Medical information updated successfully',
    inputs: Object.fromEntries(formData),
  };
}
