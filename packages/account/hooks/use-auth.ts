'use client';

import { useEffect, useState } from 'react';

import supabase from '@/supabase/client';
import { User } from '@/types/user';

export function useAuth() {
  const [user, setUser] = useState<User | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? undefined);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? undefined);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      setUser({
        id: 'local-user',
        email: 'guest@september.to',
        user_metadata: {
          full_name: 'Guest',
        },
      } as User);
    }
  }, [user, loading]);

  return { user, loading };
}
