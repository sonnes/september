import { describe, expect, it } from 'vitest';

import { parseSubscription } from './use-elevenlabs-quota';

describe('parseSubscription', () => {
  it('reads the credits used against the plan allowance', () => {
    const quota = parseSubscription({
      tier: 'creator',
      character_count: 37060,
      character_limit: 100000,
      next_character_count_reset_unix: 1786579200,
    });

    expect(quota).toEqual({
      tier: 'creator',
      used: 37060,
      limit: 100000,
      resets_at: new Date(1786579200 * 1000),
    });
  });

  it('copes with a plan that reports no reset date', () => {
    const quota = parseSubscription({ tier: 'free', character_count: 10, character_limit: 10000 });

    expect(quota?.resets_at).toBeUndefined();
    expect(quota?.limit).toBe(10000);
  });

  it('returns nothing when the response is not a subscription', () => {
    expect(parseSubscription(null)).toBeUndefined();
    expect(parseSubscription({})).toBeUndefined();
    expect(parseSubscription({ character_count: 'lots' })).toBeUndefined();
  });
});
