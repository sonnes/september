/**
 * The cloud services of the browser. The keys stay in IndexedDB on this
 * device, and every request goes from the browser to the service.
 */

import type {
  ElevenLabsQuota,
  PlatformProviders,
  Provider,
  ProviderStatus,
  Voice,
} from '@september/app-ui/platform';
import { OPENROUTER_BASE } from '@september/core/rules/model-config';
import { SETTINGS } from '@september/core/rules/settings';

import { authorizeOpenRouter } from './oauth';
import { browserRepository } from './repository';

type Keys = Partial<Record<Provider, string>>;

const NAMES: Record<Provider, string> = {
  openrouter: 'OpenRouter',
  elevenlabs: 'ElevenLabs',
};

async function keys(): Promise<Keys> {
  return (await browserRepository.getSetting<Keys>(SETTINGS.providerKeys)) ?? {};
}

async function putKeys(next: Keys): Promise<void> {
  await browserRepository.putSetting(SETTINGS.providerKeys, next);
}

/** The key of one service. It rejects when the user has not connected it. */
export async function providerKey(provider: Provider): Promise<string> {
  const key = (await keys())[provider];
  if (!key) throw new Error(`Connect ${NAMES[provider]} in Settings first.`);
  return key;
}

const headers = (provider: Provider, key: string): Record<string, string> =>
  provider === 'openrouter' ? { authorization: `Bearer ${key}` } : { 'xi-api-key': key };

const statusOf = (provider: Provider, held: Keys): ProviderStatus =>
  held[provider]
    ? { provider, connected: true, label: 'Connected', detail: 'Stored in this browser' }
    : { provider, connected: false, label: null, detail: null };

async function connect(provider: Provider, key: string, signal?: AbortSignal) {
  const trimmed = key.trim();
  const response = await fetch(
    provider === 'openrouter'
      ? `${OPENROUTER_BASE}/key`
      : 'https://api.elevenlabs.io/v1/user',
    { headers: headers(provider, trimmed), signal }
  );
  if (!response.ok) {
    throw new Error(`${NAMES[provider]} did not accept that key. Copy it and try again.`);
  }
  signal?.throwIfAborted();
  const next = { ...(await keys()), [provider]: trimmed };
  await putKeys(next);
  return statusOf(provider, next);
}

async function elevenLabs<T>(url: string, init: RequestInit = {}): Promise<T> {
  const key = await providerKey('elevenlabs');
  const response = await fetch(url, { ...init, headers: headers('elevenlabs', key) });
  if (!response.ok) {
    throw new Error(`ElevenLabs did not answer. Try again in a minute. (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const providers: PlatformProviders = {
  async status() {
    const held = await keys();
    return [statusOf('openrouter', held), statusOf('elevenlabs', held)];
  },

  connect: (provider, key) => connect(provider, key),

  async connectOpenRouter(signal) {
    const key = await authorizeOpenRouter(signal);
    signal.throwIfAborted();
    return connect('openrouter', key, signal);
  },

  async forget(provider) {
    const { [provider]: removed, ...rest } = await keys();
    await putKeys(rest);
    return Boolean(removed);
  },

  async voices(): Promise<Voice[]> {
    const answer = await elevenLabs<{
      voices: Array<{
        voice_id: string;
        name: string;
        preview_url?: string;
        category?: string;
        is_owner?: boolean;
      }>;
    }>('https://api.elevenlabs.io/v1/voices');
    return answer.voices.map(voice => ({
      id: voice.voice_id,
      name: voice.name,
      preview_url: voice.preview_url ?? null,
      category: voice.category ?? null,
      is_owner: voice.is_owner ?? null,
    }));
  },

  async quota(): Promise<ElevenLabsQuota | null> {
    if (!(await keys()).elevenlabs) return null;
    const row = await elevenLabs<{
      tier?: string;
      character_count?: number;
      character_limit?: number;
      next_character_count_reset_unix?: number;
    }>('https://api.elevenlabs.io/v1/user/subscription');
    return {
      tier: row.tier ?? null,
      character_count: row.character_count ?? 0,
      character_limit: row.character_limit ?? 0,
      resets_at: row.next_character_count_reset_unix ?? null,
    };
  },

  async cloneVoice(form) {
    const key = await providerKey('elevenlabs');
    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': key },
      body: form,
    });
    if (!response.ok) {
      throw new Error(
        `ElevenLabs could not create the voice. Try again in a minute. (${response.status})`
      );
    }
    const created = (await response.json()) as { voice_id: string };
    return { id: created.voice_id };
  },
};
