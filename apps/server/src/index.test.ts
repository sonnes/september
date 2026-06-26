import { SELF, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import { signSessionToken } from './auth';

async function tokenFor(userId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return signSessionToken({ sub: userId, jti: crypto.randomUUID(), exp }, env.SESSION_SIGNING_KEY);
}

function authed(token: string, init: RequestInit = {}): RequestInit {
  return { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` } };
}

describe('auth route', () => {
  it('rejects an invalid Google id token', async () => {
    const res = await SELF.fetch('https://x/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken: 'not-a-real-token' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects a non-POST', async () => {
    const res = await SELF.fetch('https://x/api/auth/google');
    expect(res.status).toBe(405);
  });
});

describe('sync routes require auth', () => {
  it('401s without a token', async () => {
    const res = await SELF.fetch('https://x/api/sync/pull?since=0');
    expect(res.status).toBe(401);
  });

  it('401s with a token signed by the wrong key', async () => {
    const bad = await signSessionToken(
      { sub: 'u1', jti: 'j', exp: Math.floor(Date.now() / 1000) + 100 },
      'wrong-key',
    );
    const res = await SELF.fetch('https://x/api/sync/pull?since=0', authed(bad));
    expect(res.status).toBe(401);
  });
});

describe('sync push/pull round-trip', () => {
  it('persists pushed mutations for the authenticated user', async () => {
    const token = await tokenFor('route-user-1');
    const push = await SELF.fetch(
      'https://x/api/sync/push',
      authed(token, {
        method: 'POST',
        body: JSON.stringify({
          mutations: [{ collection: 'spaces', id: 's1', op: 'upsert', data: { title: 'Hi' }, updatedAt: 1000, version: '1000' }],
        }),
      }),
    );
    expect(push.status).toBe(200);
    expect(await push.json()).toMatchObject({ applied: 1 });

    const pull = await SELF.fetch('https://x/api/sync/pull?since=0', authed(token));
    const body = (await pull.json()) as { changes: { id: string; data: unknown }[] };
    expect(body.changes).toHaveLength(1);
    expect(body.changes[0]).toMatchObject({ id: 's1', data: { title: 'Hi' } });
  });

  it('isolates one user’s data from another', async () => {
    const a = await tokenFor('route-user-a');
    const b = await tokenFor('route-user-b');
    await SELF.fetch(
      'https://x/api/sync/push',
      authed(a, {
        method: 'POST',
        body: JSON.stringify({ mutations: [{ collection: 'notes', id: 'n1', op: 'upsert', data: { x: 1 }, updatedAt: 1, version: '1' }] }),
      }),
    );
    const pull = await SELF.fetch('https://x/api/sync/pull?since=0', authed(b));
    expect((await pull.json() as { changes: unknown[] }).changes).toEqual([]);
  });
});

describe('blob routes', () => {
  it('PUT then GET round-trips under the user prefix', async () => {
    const token = await tokenFor('blob-user-1');
    const put = await SELF.fetch(
      'https://x/api/blobs/audio/hello.bin',
      authed(token, { method: 'PUT', body: new Uint8Array([1, 2, 3, 4]) }),
    );
    expect(put.status).toBe(200);

    const get = await SELF.fetch('https://x/api/blobs/audio/hello.bin', authed(token));
    expect(get.status).toBe(200);
    expect(new Uint8Array(await get.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('does not leak another user’s blob', async () => {
    const a = await tokenFor('blob-user-a');
    const b = await tokenFor('blob-user-b');
    await SELF.fetch('https://x/api/blobs/secret.bin', authed(a, { method: 'PUT', body: new Uint8Array([9]) }));
    const get = await SELF.fetch('https://x/api/blobs/secret.bin', authed(b));
    expect(get.status).toBe(404);
  });

  it('401s without a token', async () => {
    const res = await SELF.fetch('https://x/api/blobs/audio/x.bin');
    expect(res.status).toBe(401);
  });
});

describe('unknown api route', () => {
  it('404s', async () => {
    const res = await SELF.fetch('https://x/api/nope');
    expect(res.status).toBe(404);
  });
});
