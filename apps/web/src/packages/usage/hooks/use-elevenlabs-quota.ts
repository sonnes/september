'use client';

import { useEffect, useState } from 'react';

import { useAccount } from '@/packages/account';

const SUBSCRIPTION_URL = 'https://api.elevenlabs.io/v1/user/subscription';

/**
 * Credits used against the plan allowance, read from ElevenLabs itself.
 *
 * Speech is prepaid, so this is the authoritative number — unlike the dollar
 * figures elsewhere on the usage page, nothing here is estimated.
 */
export interface ElevenLabsQuota {
  tier: string;
  used: number;
  limit: number;
  resets_at?: Date;
}

/** Parse the subscription payload, tolerating shapes we do not recognise. */
export function parseSubscription(payload: unknown): ElevenLabsQuota | undefined {
  if (!payload || typeof payload !== 'object') return undefined;

  const raw = payload as Record<string, unknown>;
  const used = raw.character_count;
  const limit = raw.character_limit;

  if (typeof used !== 'number' || typeof limit !== 'number') return undefined;

  const reset = raw.next_character_count_reset_unix;

  return {
    tier: typeof raw.tier === 'string' ? raw.tier : 'unknown',
    used,
    limit,
    resets_at: typeof reset === 'number' ? new Date(reset * 1000) : undefined,
  };
}

export interface UseElevenLabsQuotaReturn {
  data?: ElevenLabsQuota;
  isLoading: boolean;
  error?: { message: string };
}

/**
 * Fetch the ElevenLabs credit balance once per mount. Without a key there is
 * nothing to ask for, and the hook stays quiet rather than erroring.
 */
export function useElevenLabsQuota(): UseElevenLabsQuotaReturn {
  const { account } = useAccount();
  const apiKey = account?.ai_providers?.elevenlabs?.api_key;

  const [data, setData] = useState<ElevenLabsQuota | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string } | undefined>(undefined);

  useEffect(() => {
    if (!apiKey) {
      setData(undefined);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(undefined);

    fetch(SUBSCRIPTION_URL, { headers: { 'xi-api-key': apiKey } })
      .then(async response => {
        if (!response.ok) throw new Error(`ElevenLabs returned ${response.status}`);
        return parseSubscription(await response.json());
      })
      .then(quota => {
        if (!cancelled) setData(quota);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError({ message: err instanceof Error ? err.message : 'Could not read your plan' });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  return { data, isLoading, error };
}
