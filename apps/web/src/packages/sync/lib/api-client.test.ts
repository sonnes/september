import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSyncClient } from './api-client';

function mockFetch(impl: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn as unknown as typeof fetch);
  return fn;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('createSyncClient', () => {
  it('login posts the id token and returns the session', async () => {
    const fetchFn = mockFetch(() => json({ token: 'sess', userId: 'u1' }));
    const client = createSyncClient({ baseUrl: 'https://api.test', getToken: () => null });

    const res = await client.login('google-id-token');
    expect(res).toEqual({ token: 'sess', userId: 'u1' });

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://api.test/api/auth/google');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ idToken: 'google-id-token' });
  });

  it('push sends mutations with the bearer token', async () => {
    const fetchFn = mockFetch(() => json({ cursor: 5, applied: 1 }));
    const client = createSyncClient({ baseUrl: 'https://api.test', getToken: () => 'tok' });

    const result = await client.push([
      { collection: 'spaces', id: 's1', op: 'upsert', data: { title: 'Hi' }, updatedAt: 1000 },
    ]);
    expect(result).toEqual({ cursor: 5, applied: 1 });

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://api.test/api/sync/push');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('pull requests changes since the cursor', async () => {
    const fetchFn = mockFetch(() => json({ changes: [], cursor: 9 }));
    const client = createSyncClient({ baseUrl: 'https://api.test', getToken: () => 'tok' });

    const result = await client.pull(9);
    expect(result).toEqual({ changes: [], cursor: 9 });
    expect(fetchFn.mock.calls[0][0]).toBe('https://api.test/api/sync/pull?since=9');
  });

  it('throws on a non-ok response', async () => {
    mockFetch(() => new Response('nope', { status: 401 }));
    const client = createSyncClient({ baseUrl: 'https://api.test', getToken: () => null });
    await expect(client.pull(0)).rejects.toThrow(/401/);
  });

  it('uploads and downloads blobs under the key', async () => {
    const fetchFn = mockFetch((url, init) => {
      if (init?.method === 'PUT') return json({ ok: true });
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    });
    const client = createSyncClient({ baseUrl: 'https://api.test', getToken: () => 'tok' });

    await client.putBlob('audio/x.bin', new Uint8Array([1, 2, 3]));
    expect(fetchFn.mock.calls[0][0]).toBe('https://api.test/api/blobs/audio/x.bin');

    const bytes = await client.getBlob('audio/x.bin');
    expect(new Uint8Array(bytes!)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('getBlob returns null on 404', async () => {
    mockFetch(() => new Response('', { status: 404 }));
    const client = createSyncClient({ baseUrl: 'https://api.test', getToken: () => 'tok' });
    expect(await client.getBlob('missing')).toBeNull();
  });
});
