import type { User } from '@/packages/shared';

import type { Account } from './schema';

export const LOCAL_USER: User = {
  id: 'local-user',
  email: 'guest@september.to',
  user_metadata: {
    full_name: 'Guest',
  },
};

export function createDefaultAccount(user: User = LOCAL_USER): Account {
  const now = new Date();

  return {
    id: user.id,
    name: user.user_metadata?.full_name ?? 'Guest',
    ai_suggestions: {
      enabled: false,
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      settings: {},
    },
    ai_transcription: {
      enabled: false,
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      settings: {},
    },
    ai_speech: {
      enabled: true,
      provider: 'browser',
      settings: {},
    },
    ai_providers: {},
    terms_accepted: false,
    privacy_policy_accepted: false,
    onboarding_completed: false,
    created_at: now,
    updated_at: now,
  };
}
