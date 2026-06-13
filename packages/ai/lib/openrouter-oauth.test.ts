// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OPENROUTER_AUTHORIZE_URL,
  OPENROUTER_KEYS_URL,
  VERIFIER_STORAGE_KEY,
  buildAuthorizeUrl,
  completeOpenRouterAuth,
  exchangeCodeForKey,
  generatePkcePair,
  startOpenRouterAuth,
} from './openrouter-oauth';

// Local re-implementation of the S256 challenge so the test verifies the lib
// independently rather than trusting its own output.
async function expectedChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  let binary = '';
  for (const b of hash) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const BASE64URL = /^[A-Za-z0-9_-]+$/;

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('generatePkcePair', () => {
  it('returns a base64url verifier and an S256 challenge derived from it', async () => {
    const { verifier, challenge } = await generatePkcePair();

    expect(verifier).toMatch(BASE64URL);
    expect(challenge).toMatch(BASE64URL);
    expect(challenge).toBe(await expectedChallenge(verifier));
  });

  it('produces a fresh verifier each call', async () => {
    const a = await generatePkcePair();
    const b = await generatePkcePair();
    expect(a.verifier).not.toBe(b.verifier);
  });
});

describe('buildAuthorizeUrl', () => {
  it('targets the OpenRouter /auth endpoint with S256 params', () => {
    const url = new URL(
      buildAuthorizeUrl({ callbackUrl: 'http://localhost:3000/settings/providers', challenge: 'CHAL' })
    );

    expect(`${url.origin}${url.pathname}`).toBe(OPENROUTER_AUTHORIZE_URL);
    expect(url.searchParams.get('callback_url')).toBe('http://localhost:3000/settings/providers');
    expect(url.searchParams.get('code_challenge')).toBe('CHAL');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });
});

describe('exchangeCodeForKey', () => {
  it('POSTs code + verifier to the keys endpoint and returns the key', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ key: 'sk-or-v1-abc' }), { status: 200 }));

    const key = await exchangeCodeForKey({ code: 'the-code', verifier: 'the-verifier' });

    expect(key).toBe('sk-or-v1-abc');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe(OPENROUTER_KEYS_URL);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      code: 'the-code',
      code_verifier: 'the-verifier',
      code_challenge_method: 'S256',
    });
  });

  it('throws on a non-2xx response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 400 }));
    await expect(exchangeCodeForKey({ code: 'c', verifier: 'v' })).rejects.toThrow();
  });

  it('throws when the response has no key', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );
    await expect(exchangeCodeForKey({ code: 'c', verifier: 'v' })).rejects.toThrow();
  });
});

describe('startOpenRouterAuth', () => {
  // jsdom's window.location.assign isn't spy-able directly, so replace location.
  const originalLocation = window.location;
  let assign: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    assign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('stores the verifier and redirects with the matching challenge', async () => {
    await startOpenRouterAuth('http://localhost:3000/settings/providers');

    const verifier = sessionStorage.getItem(VERIFIER_STORAGE_KEY);
    expect(verifier).toMatch(BASE64URL);

    expect(assign).toHaveBeenCalledTimes(1);
    const url = new URL(assign.mock.calls[0][0] as string);
    expect(url.searchParams.get('code_challenge')).toBe(await expectedChallenge(verifier as string));
    expect(url.searchParams.get('callback_url')).toBe('http://localhost:3000/settings/providers');
  });
});

describe('completeOpenRouterAuth', () => {
  it('exchanges the code using the stored verifier and clears it', async () => {
    sessionStorage.setItem(VERIFIER_STORAGE_KEY, 'stored-verifier');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ key: 'sk-or-v1-xyz' }), { status: 200 })
    );

    const key = await completeOpenRouterAuth('cb-code');

    expect(key).toBe('sk-or-v1-xyz');
    expect(sessionStorage.getItem(VERIFIER_STORAGE_KEY)).toBeNull();
  });

  it('throws when no verifier was stored', async () => {
    await expect(completeOpenRouterAuth('cb-code')).rejects.toThrow();
  });
});
