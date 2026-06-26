// Auth primitives: stateless session tokens (HMAC) verified at the Worker edge,
// and Google ID-token (OIDC) verification. Both run on Web Crypto, so they work
// inside the Worker runtime and inside Durable Objects.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function base64UrlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export interface SessionPayload {
  sub: string; // userId
  jti: string; // token id (for revocation)
  exp: number; // unix seconds
}

async function hmacKey(signingKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signSessionToken(payload: SessionPayload, signingKey: string): Promise<string> {
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(signingKey), encoder.encode(payloadB64));
  return `${payloadB64}.${base64UrlEncode(new Uint8Array(sig))}`;
}

export async function verifySessionToken(
  token: string,
  signingKey: string,
): Promise<SessionPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  try {
    const ok = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(signingKey),
      base64UrlDecode(sigB64),
      encoder.encode(payloadB64),
    );
    if (!ok) return null;
    const payload = JSON.parse(decoder.decode(base64UrlDecode(payloadB64))) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now() / 1000) return null;
    if (typeof payload.sub !== 'string' || typeof payload.jti !== 'string') return null;
    return payload;
  } catch {
    return null;
  }
}

// --- Google ID token (OIDC) ---

export interface GoogleIdentity {
  sub: string;
  email: string;
  email_verified: true;
}

interface Jwks {
  keys: JsonWebKey[];
}

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const VALID_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

type JwksProvider = () => Promise<Jwks>;

// Module-level cache so repeated logins reuse Google's certs (they rotate slowly).
let cachedJwks: { value: Jwks; expiresAt: number } | null = null;

const defaultJwksProvider: JwksProvider = async () => {
  if (cachedJwks && cachedJwks.expiresAt > Date.now()) return cachedJwks.value;
  const res = await fetch(GOOGLE_JWKS_URL);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const value = (await res.json()) as Jwks;
  const cacheControl = res.headers.get('cache-control') ?? '';
  const maxAge = Number(/max-age=(\d+)/.exec(cacheControl)?.[1] ?? 3600);
  cachedJwks = { value, expiresAt: Date.now() + maxAge * 1000 };
  return value;
};

/**
 * Verify a Google ID token. Returns the identity on success, or null on any
 * failure (bad signature, wrong audience/issuer, expired, unverified email).
 * `jwksProvider` is injectable for testing; defaults to Google's cached JWKS.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
  jwksProvider: JwksProvider = defaultJwksProvider,
): Promise<GoogleIdentity | null> {
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, bodyB64, sigB64] = parts;
  try {
    const header = JSON.parse(decoder.decode(base64UrlDecode(headerB64))) as {
      alg?: string;
      kid?: string;
    };
    if (header.alg !== 'RS256' || !header.kid) return null;

    const jwks = await jwksProvider();
    const jwk = jwks.keys.find((k) => (k as JsonWebKey & { kid?: string }).kid === header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      base64UrlDecode(sigB64),
      encoder.encode(`${headerB64}.${bodyB64}`),
    );
    if (!ok) return null;

    const claims = JSON.parse(decoder.decode(base64UrlDecode(bodyB64))) as Record<string, unknown>;
    if (!VALID_ISSUERS.includes(String(claims.iss))) return null;
    if (claims.aud !== clientId) return null;
    if (typeof claims.exp !== 'number' || claims.exp < Date.now() / 1000) return null;
    if (claims.email_verified !== true) return null;
    if (typeof claims.sub !== 'string' || typeof claims.email !== 'string') return null;

    return { sub: claims.sub, email: claims.email, email_verified: true };
  } catch {
    return null;
  }
}
