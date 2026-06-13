/**
 * "Connect with OpenRouter" — OAuth PKCE (S256) flow.
 *
 * Fully client-side and local-first: the redirect obtains a *user-controlled*
 * API key that we store in the user's local account. No September backend or
 * server-side identity is involved. See OpenRouter docs:
 * https://openrouter.ai/docs/guides/overview/auth/oauth
 */

export const OPENROUTER_AUTHORIZE_URL = 'https://openrouter.ai/auth';
export const OPENROUTER_KEYS_URL = 'https://openrouter.ai/api/v1/auth/keys';

/** sessionStorage key holding the PKCE code_verifier across the redirect. */
export const VERIFIER_STORAGE_KEY = 'september.openrouter.pkce_verifier';

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

/** Generate a PKCE verifier and its S256 challenge (`base64url(sha256(verifier))`). */
export async function generatePkcePair(): Promise<{ verifier: string; challenge: string }> {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const verifier = base64UrlEncode(random);
  const challenge = base64UrlEncode(await sha256(verifier));
  return { verifier, challenge };
}

/** Build the OpenRouter authorize URL the user is redirected to. */
export function buildAuthorizeUrl({
  callbackUrl,
  challenge,
}: {
  callbackUrl: string;
  challenge: string;
}): string {
  const params = new URLSearchParams({
    callback_url: callbackUrl,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `${OPENROUTER_AUTHORIZE_URL}?${params.toString()}`;
}

/** Exchange the authorization code (with the PKCE verifier) for a user API key. */
export async function exchangeCodeForKey({
  code,
  verifier,
}: {
  code: string;
  verifier: string;
}): Promise<string> {
  const res = await fetch(OPENROUTER_KEYS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      code_verifier: verifier,
      code_challenge_method: 'S256',
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter token exchange failed (${res.status})`);
  }

  const data = (await res.json()) as { key?: string };
  if (!data.key) {
    throw new Error('OpenRouter token exchange returned no key');
  }
  return data.key;
}

/**
 * Start the flow: generate PKCE, persist the verifier, and redirect to OpenRouter.
 * `callbackUrl` must be where the user should return (https on 443/3000, or any
 * localhost port). Returns after navigation is triggered.
 */
export async function startOpenRouterAuth(callbackUrl: string): Promise<void> {
  const { verifier, challenge } = await generatePkcePair();
  sessionStorage.setItem(VERIFIER_STORAGE_KEY, verifier);
  window.location.assign(buildAuthorizeUrl({ callbackUrl, challenge }));
}

/**
 * Finish the flow on the callback: read the stored verifier, exchange the code
 * for an API key, and clear the verifier. Throws if no verifier is present
 * (e.g. the user landed here without starting the flow).
 */
export async function completeOpenRouterAuth(code: string): Promise<string> {
  const verifier = sessionStorage.getItem(VERIFIER_STORAGE_KEY);
  if (!verifier) {
    throw new Error('Missing PKCE verifier; restart the OpenRouter connection.');
  }
  try {
    return await exchangeCodeForKey({ code, verifier });
  } finally {
    sessionStorage.removeItem(VERIFIER_STORAGE_KEY);
  }
}
