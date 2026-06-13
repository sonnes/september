'use client';

import type { User } from '@/packages/shared';

import { LOCAL_USER } from './defaults';

export function useCurrentUser(): { user: User; loading: false } {
  return { user: LOCAL_USER, loading: false };
}
