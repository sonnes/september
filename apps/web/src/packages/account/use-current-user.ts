'use client';

import type { User } from '@/packages/shared';
import { useSyncAuth } from '@/packages/sync';

import { LOCAL_USER } from './defaults';

export function useCurrentUser(): { user: User; loading: boolean } {
  // When signed in (sync enabled), use the authenticated user; otherwise stay in
  // local-only guest mode.
  const auth = useSyncAuth();
  if (auth?.user) return { user: auth.user, loading: false };
  return { user: LOCAL_USER, loading: false };
}
