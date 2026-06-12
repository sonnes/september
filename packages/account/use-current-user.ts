'use client';

import type { User } from '@september/shared';

import { LOCAL_USER } from './defaults';

export function useCurrentUser(): { user: User; loading: false } {
  return { user: LOCAL_USER, loading: false };
}
