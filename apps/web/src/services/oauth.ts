/** PKCE secrets stay in the initiating window; the callback carries only a code. */
export async function authorizeOpenRouter(signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();
  const popup = window.open('about:blank', '_blank');
  if (!popup) throw new Error('Allow pop-ups for September, then try connecting again.');
  // COOP severs the opener across origins. BroadcastChannel works when the
  // callback returns to our origin, without exposing the verifier or API key.
  popup.opener = null;
  const channel = new BroadcastChannel('september-openrouter');
  const state = crypto.randomUUID();
  const verifier = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  const cancel = new AbortController();
  const abort = () => cancel.abort();
  signal.addEventListener('abort', abort, { once: true });
  const timer = window.setTimeout(() => cancel.abort(), 5 * 60 * 1000);
  let rejectCallback: (reason: Error) => void = () => undefined;
  const onAbort = () => rejectCallback(new Error('Connection cancelled or timed out. Try again.'));
  cancel.signal.addEventListener('abort', onAbort, { once: true });
  try {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    cancel.signal.throwIfAborted();
    const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
    const callback = new URL('/oauth/openrouter.html', window.location.origin);
    callback.searchParams.set('state', state);
    const auth = new URL('https://openrouter.ai/auth');
    auth.search = new URLSearchParams({ callback_url: callback.href, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
    const pending = new Promise<string>((resolve, reject) => {
      rejectCallback = reject;
      channel.onmessage = ({ data }) => {
        if (!data || data.state !== state) return;
        if (typeof data.code === 'string' && data.code.length > 0 && data.code.length <= 4096) resolve(data.code);
        else reject(new Error('OpenRouter did not authorize the connection. Try again.'));
      };
    });
    popup.location.replace(auth.href);
    const code = await pending;
    channel.onmessage = null;
    const response = await fetch('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }),
      signal: cancel.signal,
    });
    if (!response.ok) throw new Error('OpenRouter authorization expired or failed. Try connecting again.');
    const body = await response.json();
    cancel.signal.throwIfAborted();
    if (typeof body.key !== 'string' || !body.key) throw new Error('OpenRouter did not return a key. Try connecting again.');
    return body.key;
  } finally {
    window.clearTimeout(timer);
    signal.removeEventListener('abort', abort);
    cancel.signal.removeEventListener('abort', onAbort);
    channel.close();
    popup.close();
  }
}
