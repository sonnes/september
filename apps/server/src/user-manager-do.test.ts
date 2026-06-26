import { env, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import { verifySessionToken } from './auth';

function manager(name = 'global') {
  const id = env.USER_MANAGER.idFromName(name);
  return env.USER_MANAGER.get(id);
}

const identity = (overrides: Partial<{ sub: string; email: string }> = {}) => ({
  sub: 'google-sub-abc',
  email: 'user@example.com',
  ...overrides,
});

describe('UserManagerDO', () => {
  it('creates a user and issues a verifiable token bound to the userId', async () => {
    const { token, userId } = await manager().upsertAndIssue(identity());
    expect(userId).toMatch(/^[0-9a-f-]{36}$/);

    const payload = await verifySessionToken(token, env.SESSION_SIGNING_KEY);
    expect(payload?.sub).toBe(userId);
    expect(payload?.jti).toBeTruthy();
  });

  it('is idempotent: same google sub returns the same userId', async () => {
    const m = manager('idempotent');
    const first = await m.upsertAndIssue(identity({ sub: 'sub-1' }));
    const second = await m.upsertAndIssue(identity({ sub: 'sub-1', email: 'changed@example.com' }));
    expect(second.userId).toBe(first.userId);
    expect(first.token).not.toBe(second.token); // fresh token each login
  });

  it('gives different users different ids', async () => {
    const m = manager('distinct');
    const a = await m.upsertAndIssue(identity({ sub: 'sub-a' }));
    const b = await m.upsertAndIssue(identity({ sub: 'sub-b' }));
    expect(a.userId).not.toBe(b.userId);
  });

  it('persists the sub→userId mapping', async () => {
    const m = manager('persist');
    const { userId } = await m.upsertAndIssue(identity({ sub: 'sub-persist' }));
    expect(await m.userIdForSub('sub-persist')).toBe(userId);
    expect(await m.userIdForSub('missing')).toBeNull();
  });

  it('tracks token revocation', async () => {
    const m = manager('revoke');
    const exp = Math.floor(Date.now() / 1000) + 100;
    expect(await m.isRevoked('jti-x')).toBe(false);
    await m.revoke('jti-x', exp);
    expect(await m.isRevoked('jti-x')).toBe(true);
  });

  it('creates its tables in storage', async () => {
    const id = env.USER_MANAGER.idFromName('schema');
    const stub = env.USER_MANAGER.get(id);
    await stub.upsertAndIssue(identity({ sub: 'sub-schema' }));
    await runInDurableObject(stub, (_instance, state) => {
      const tables = state.storage.sql
        .exec("SELECT name FROM sqlite_master WHERE type='table'")
        .toArray()
        .map((r) => r.name);
      expect(tables).toContain('users');
      expect(tables).toContain('revoked_tokens');
    });
  });
});
