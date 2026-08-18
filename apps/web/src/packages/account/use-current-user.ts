'use client';

import { useEffect, useState } from 'react';

import type { User } from '@/packages/shared';
import { getDesktopOsUser, isDesktopRuntime } from '@/packages/shared/lib/data';
import { useSyncAuth } from '@/packages/sync';

import { LOCAL_USER } from './defaults';

export function useCurrentUser(): { user: User; loading: boolean } {
  const auth = useSyncAuth();
  const desktop = isDesktopRuntime();
  const [desktopUser, setDesktopUser] = useState<User | null>(null);

  useEffect(() => {
    if (!desktop) return;
    let cancelled = false;
    void getDesktopOsUser()
      .then(user => {
        if (cancelled) return;
        setDesktopUser({
          id: user.id,
          user_metadata: { full_name: user.name },
        });
      })
      .catch(error => {
        console.error('Failed to read the OS user:', error);
        if (!cancelled) setDesktopUser(LOCAL_USER);
      });
    return () => {
      cancelled = true;
    };
  }, [desktop]);

  if (desktop) return { user: desktopUser ?? LOCAL_USER, loading: desktopUser === null };
  if (auth?.user) return { user: auth.user, loading: false };
  return { user: LOCAL_USER, loading: false };
}
