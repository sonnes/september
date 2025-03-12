'use server';

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
