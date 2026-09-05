import { createHash, webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { authorizeOpenRouter } from './oauth';
let channel: { onmessage: ((event: MessageEvent) => void) | null; close: ReturnType<typeof vi.fn> };
const popup = { location: { replace: vi.fn() }, close: vi.fn() };
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('BroadcastChannel', class {
    onmessage = null;
    close = vi.fn();
    constructor() {
      // Capture the mock transport to deliver a callback from the other window.
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      channel = this;
    }
  });
  vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ key: 'issued-key' }) })));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
async function callback() {
  await vi.waitFor(() => expect(popup.location.replace).toHaveBeenCalled());
  const auth = new URL(popup.location.replace.mock.calls[0][0]);
  expect(auth.origin).toBe('https://openrouter.ai');
  expect(auth.searchParams.get('code_challenge_method')).toBe('S256');
  return new URL(auth.searchParams.get('callback_url')!);
}
it('binds the callback to this attempt and exchanges using its verifier', async () => {
  const pending = authorizeOpenRouter(new AbortController().signal);
  const url = await callback();
  channel.onmessage!(new MessageEvent('message', { data: { state: 'wrong', code: 'foreign' } }));
  expect(fetch).not.toHaveBeenCalled();
  channel.onmessage!(new MessageEvent('message', { data: { state: url.searchParams.get('state'), code: 'code' } }));
  await expect(pending).resolves.toBe('issued-key');
  const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
  expect(body).toMatchObject({ code: 'code', code_challenge_method: 'S256' });
  const auth = new URL(popup.location.replace.mock.calls[0][0]);
  expect(auth.searchParams.get('code_challenge')).toBe(createHash('sha256').update(body.code_verifier).digest('base64url'));
  expect(channel.close).toHaveBeenCalled();
});
it('cancels without exchanging a code', async () => {
  const cancel = new AbortController();
  const pending = authorizeOpenRouter(cancel.signal);
  const rejected = expect(pending).rejects.toThrow();
  await callback();
  cancel.abort();
  await rejected;
  expect(fetch).not.toHaveBeenCalled();
  expect(channel.close).toHaveBeenCalled();
});
it('reports a blocked authorization window', async () => {
  vi.mocked(window.open).mockReturnValue(null);
  await expect(authorizeOpenRouter(new AbortController().signal)).rejects.toThrow(/pop-up/i);
});

it('does not accept a failed code exchange', async () => {
  vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
  const pending = authorizeOpenRouter(new AbortController().signal);
  const rejected = expect(pending).rejects.toThrow(/expired or failed/);
  const url = await callback();
  channel.onmessage!(new MessageEvent('message', { data: { state: url.searchParams.get('state'), code: 'expired' } }));
  await rejected;
  expect(channel.close).toHaveBeenCalled();
});
