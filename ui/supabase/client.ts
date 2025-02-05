import { createBrowserClient } from '@supabase/ssr';

import { Database } from '../types/supabase';

// Create a single supabase client for interacting with your database
export const db = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
