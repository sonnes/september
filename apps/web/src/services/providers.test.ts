import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { providers } from './providers';

afterEach(() => vi.unstubAllGlobals());

const answer = (body: unknown, status = 200) =>
  vi.fn(
    async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status })
  );

describe('the browser providers', () => {
  it('keeps a key only after the service accepts it, and forgets it on request', async () => {
    vi.stubGlobal('fetch', answer({}, 401));
    await expect(providers.connect('elevenlabs', 'bad')).rejects.toThrow(
      'ElevenLabs did not accept that key.'
    );
    expect((await providers.status()).find(one => one.provider === 'elevenlabs')?.connected).toBe(
      false
    );

    const accepted = answer({});
    vi.stubGlobal('fetch', accepted);
    const status = await providers.connect('elevenlabs', '  xi-key  ');
    expect(status).toMatchObject({ provider: 'elevenlabs', connected: true });
    expect(new Headers(accepted.mock.calls[0][1]?.headers).get('xi-api-key')).toBe('xi-key');
    expect(await providers.status()).toContainEqual(
      expect.objectContaining({ provider: 'elevenlabs', connected: true })
    );

    expect(await providers.forget('elevenlabs')).toBe(true);
    expect(await providers.forget('elevenlabs')).toBe(false);
    expect(await providers.quota()).toBeNull();
  });

  it('passes the category and owner of each ElevenLabs voice to the screen', async () => {
    vi.stubGlobal('fetch', answer({}));
    await providers.connect('elevenlabs', 'xi-key');
    vi.stubGlobal(
      'fetch',
      answer({ voices: [{ voice_id: 'v1', name: 'Mine', category: 'cloned', is_owner: true }] })
    );

    expect(await providers.voices()).toEqual([
      { id: 'v1', name: 'Mine', preview_url: null, category: 'cloned', is_owner: true },
    ]);
  });

  it('rejects when ElevenLabs does not answer the allowance', async () => {
    vi.stubGlobal('fetch', answer({}));
    await providers.connect('elevenlabs', 'xi-key');
    vi.stubGlobal('fetch', answer({}, 500));

    await expect(providers.quota()).rejects.toThrow('ElevenLabs did not answer.');
  });
});
