import { describe, expect, it } from 'vitest';

import {
  base64UrlDecode,
  base64UrlEncode,
  signSessionToken,
  verifyGoogleIdToken,
  verifySessionToken,
} from './auth';

const KEY = 'unit-test-signing-key';

describe('base64url', () => {
  it('round-trips bytes without padding', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255]);
    const encoded = base64UrlEncode(bytes);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(Array.from(base64UrlDecode(encoded))).toEqual(Array.from(bytes));
  });
});

describe('session tokens', () => {
  it('signs and verifies a valid token', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = await signSessionToken({ sub: 'user-1', jti: 'j1', exp }, KEY);
    const payload = await verifySessionToken(token, KEY);
    expect(payload).toEqual({ sub: 'user-1', jti: 'j1', exp });
  });

  it('rejects a token signed with a different key', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = await signSessionToken({ sub: 'user-1', jti: 'j1', exp }, KEY);
    expect(await verifySessionToken(token, 'other-key')).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = await signSessionToken({ sub: 'user-1', jti: 'j1', exp }, KEY);
    const [, sig] = token.split('.');
    const forged = base64UrlEncode(
      new TextEncoder().encode(JSON.stringify({ sub: 'admin', jti: 'j1', exp })),
    );
    expect(await verifySessionToken(`${forged}.${sig}`, KEY)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const exp = Math.floor(Date.now() / 1000) - 1;
    const token = await signSessionToken({ sub: 'user-1', jti: 'j1', exp }, KEY);
    expect(await verifySessionToken(token, KEY)).toBeNull();
  });

  it('rejects malformed input', async () => {
    expect(await verifySessionToken('garbage', KEY)).toBeNull();
    expect(await verifySessionToken('a.b.c', KEY)).toBeNull();
    expect(await verifySessionToken('', KEY)).toBeNull();
  });
});

// --- Google ID token verification, using a locally-generated RSA key as a fake Google ---

const CLIENT_ID = 'test-client.apps.googleusercontent.com';

async function makeGoogleToken(
  claims: Record<string, unknown>,
): Promise<{ token: string; jwks: { keys: JsonWebKey[] } }> {
  const kid = 'test-kid';
  const pair = (await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' })));
  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const signingInput = `${header}.${body}`;
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    pair.privateKey,
    new TextEncoder().encode(signingInput),
  );
  const token = `${signingInput}.${base64UrlEncode(new Uint8Array(sig))}`;
  const jwk = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as JsonWebKey & {
    kid: string;
    alg: string;
    use: string;
  };
  jwk.kid = kid;
  jwk.alg = 'RS256';
  jwk.use = 'sig';
  return { token, jwks: { keys: [jwk] } };
}

function validClaims(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    sub: 'google-sub-123',
    email: 'user@example.com',
    email_verified: true,
    exp: now + 3600,
    iat: now,
    ...overrides,
  };
}

describe('verifyGoogleIdToken', () => {
  it('accepts a valid token and returns sub + email', async () => {
    const { token, jwks } = await makeGoogleToken(validClaims());
    const result = await verifyGoogleIdToken(token, CLIENT_ID, async () => jwks);
    expect(result).toMatchObject({ sub: 'google-sub-123', email: 'user@example.com' });
  });

  it('rejects a token for a different audience', async () => {
    const { token, jwks } = await makeGoogleToken(validClaims({ aud: 'someone-else' }));
    expect(await verifyGoogleIdToken(token, CLIENT_ID, async () => jwks)).toBeNull();
  });

  it('rejects a wrong issuer', async () => {
    const { token, jwks } = await makeGoogleToken(validClaims({ iss: 'https://evil.com' }));
    expect(await verifyGoogleIdToken(token, CLIENT_ID, async () => jwks)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const { token, jwks } = await makeGoogleToken(
      validClaims({ exp: Math.floor(Date.now() / 1000) - 10 }),
    );
    expect(await verifyGoogleIdToken(token, CLIENT_ID, async () => jwks)).toBeNull();
  });

  it('rejects unverified email', async () => {
    const { token, jwks } = await makeGoogleToken(validClaims({ email_verified: false }));
    expect(await verifyGoogleIdToken(token, CLIENT_ID, async () => jwks)).toBeNull();
  });

  it('rejects when the signing key is not in the JWKS', async () => {
    const { token } = await makeGoogleToken(validClaims());
    const { jwks: otherJwks } = await makeGoogleToken(validClaims());
    expect(await verifyGoogleIdToken(token, CLIENT_ID, async () => otherJwks)).toBeNull();
  });
});
