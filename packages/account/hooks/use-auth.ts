'use client';

import { User } from '@september/shared/types/user';

export interface UseAuthReturn {
  user: User | undefined;
  loading: boolean;
}

const LOCAL_USER: User = {
  id: 'local-user',
  email: 'guest@september.to',
  user_metadata: {
    full_name: 'Guest',
  },
} as User;

export function useAuth(): UseAuthReturn {
  return { user: LOCAL_USER, loading: false };
}
