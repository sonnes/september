import type { OnboardingDraft } from '@/rules/onboarding';
import { panelStateFrom, type PanelState } from '@/rules/panel';
import { getRepository } from '@/services/repository';
import type { SpeechSettings } from '@/services/speech';

export const osName = '';
export const LOCAL_USER = 'local-user';

export type SavedSetup = OnboardingDraft & { id: string };

let setup: SavedSetup | null = null;
let lastPath: string | null = null;
let speech: SpeechSettings | null = null;
let panel: PanelState = panelStateFrom(null);
let providerKeys: Partial<Record<Provider, string>> = {};
let selectedOutput = '';
let bootstrapped = false;

export const dismissedIdeas: string[] = [];
export const spaceModes: Record<string, string> = {};
export let newSpaceDraft = '';

/** Loads the small settings cache before the router chooses its first screen. */
export async function bootstrapBrowserServices(): Promise<void> {
  if (bootstrapped) return;
  const repository = await getRepository();
  const [savedSetup, savedPath, savedSpeech, savedDismissed, savedModes, savedDraft, savedPanel, keys, output] =
    await Promise.all([
      repository.getSetting<SavedSetup>('setup'),
      repository.getSetting<string>('lastPath'),
      repository.getSetting<SpeechSettings>('speech'),
      repository.getSetting<string[]>('dismissed-ideas'),
      repository.getSetting<Record<string, string>>('space-modes'),
      repository.getSetting<string>('new-space-draft'),
      repository.getSetting<unknown>('panel-open'),
      repository.getSetting<Partial<Record<Provider, string>>>('provider-keys'),
      repository.getSetting<string>('audio-output'),
    ]);
  setup = savedSetup;
  lastPath = savedPath;
  speech = savedSpeech;
  dismissedIdeas.splice(0, dismissedIdeas.length, ...(savedDismissed ?? []));
  Object.assign(spaceModes, savedModes ?? {});
  newSpaceDraft = savedDraft ?? '';
  panel = panelStateFrom(savedPanel);
  providerKeys = keys ?? {};
  selectedOutput = output ?? '';
  bootstrapped = true;
}

export function currentSetup(): SavedSetup | null {
  return setup;
}

export function currentUserId(): string {
  return setup?.id ?? LOCAL_USER;
}

export async function saveSetup(draft: OnboardingDraft): Promise<void> {
  const saved: SavedSetup = { ...draft, id: setup?.id ?? LOCAL_USER };
  await (await getRepository()).putSetting('setup', saved);
  setup = saved;
}

export async function updateSetup(patch: Partial<OnboardingDraft>): Promise<SavedSetup> {
  const saved: SavedSetup = {
    ...(setup ?? { id: LOCAL_USER, name: '', speakingStyle: '', personalWords: '', mode: null, writingService: 'none', writingModel: '', voiceService: 'system' }),
    ...patch,
  };
  await (await getRepository()).putSetting('setup', saved);
  setup = saved;
  return saved;
}

export function currentPath(): string | null {
  return lastPath;
}

export async function savePath(path: string): Promise<void> {
  if (path === lastPath) return;
  lastPath = path;
  await (await getRepository()).putSetting('lastPath', path);
}

export const openInBrowser = async (url: string): Promise<void> => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export function currentSpeech(): SpeechSettings | null {
  return speech;
}

export async function saveSpeech(settings: SpeechSettings): Promise<void> {
  await (await getRepository()).putSetting('speech', settings);
  speech = settings;
}

let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;

function clearActiveAudio(): void {
  const audio = activeAudio;
  const url = activeAudioUrl;
  activeAudio = null;
  activeAudioUrl = null;
  if (audio) {
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
  }
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

function elevenLabsKey(): string {
  const key = providerKeys.elevenlabs;
  if (!key) throw new Error('Connect ElevenLabs in Settings first.');
  return key;
}

async function speechBlobId(text: string, settings: SpeechSettings): Promise<string> {
  const input = new TextEncoder().encode(
    JSON.stringify({
      text,
      voiceId: settings.voiceId,
      modelId: settings.modelId,
      stability: settings.stability,
      similarity: settings.similarity,
      speed: settings.speed,
    })
  );
  const digest = await crypto.subtle.digest('SHA-256', input);
  const hash = [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  return `speech:${hash}`;
}

export async function synthesizeSpeech(
  text: string,
  settings: SpeechSettings
): Promise<{ path: string; from_cache: boolean }> {
  if (!settings.voiceId) throw new Error('Choose an ElevenLabs voice first.');
  const cacheId = await speechBlobId(text, settings);
  let repository: Awaited<ReturnType<typeof getRepository>> | null = null;
  try {
    repository = await getRepository();
    const cached = await repository.getBlob(cacheId);
    if (cached) return { path: URL.createObjectURL(cached), from_cache: true };
  } catch {
    // Speech remains available when private storage is denied or full.
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(settings.voiceId)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'xi-api-key': elevenLabsKey() },
      body: JSON.stringify({
        text,
        model_id: settings.modelId,
        voice_settings: {
          stability: settings.stability,
          similarity_boost: settings.similarity,
          speed: settings.speed,
        },
      }),
    }
  );
  if (!response.ok) throw new Error(`ElevenLabs could not speak (${response.status}).`);
  const speechFile = await response.blob();
  try {
    await repository?.putBlob(cacheId, speechFile);
  } catch {
    // The new file can still play even when the cache write fails.
  }
  return { path: URL.createObjectURL(speechFile), from_cache: false };
}

export async function speakSystem(text: string, settings: SpeechSettings): Promise<void> {
  if (!('speechSynthesis' in window)) throw new Error('This browser has no system voice.');
  await new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.speed;
    if (settings.voiceId) {
      utterance.voice = speechSynthesis
        .getVoices()
        .find(voice => voice.voiceURI === settings.voiceId || voice.name === settings.voiceId) ?? null;
    }
    utterance.onend = () => resolve();
    utterance.onerror = event => reject(new Error(event.error || 'The browser voice stopped.'));
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  });
}

export async function playSpeechFile(path: string): Promise<void> {
  clearActiveAudio();
  const audio = new Audio(path);
  activeAudio = audio;
  activeAudioUrl = path;
  try {
    if (selectedOutput && 'setSinkId' in audio) {
      await (audio as HTMLAudioElement & { setSinkId(id: string): Promise<void> }).setSinkId(
        selectedOutput
      );
    }
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('The voice file could not play.'));
      audio.play().catch(reject);
    });
  } finally {
    if (activeAudio === audio) clearActiveAudio();
  }
}

export async function stopNativeSpeech(): Promise<void> {
  window.speechSynthesis?.cancel();
  clearActiveAudio();
}

export const audioUrl = (path: string) => path;

export async function rememberDismissed(texts: string[]): Promise<void> {
  dismissedIdeas.splice(0, dismissedIdeas.length, ...texts);
  await (await getRepository()).putSetting('dismissed-ideas', texts);
}

export async function rememberModes(modes: Record<string, string>): Promise<void> {
  Object.assign(spaceModes, modes);
  await (await getRepository()).putSetting('space-modes', modes);
}

export async function rememberDraft(words: string): Promise<void> {
  newSpaceDraft = words;
  await (await getRepository()).putSetting('new-space-draft', words);
}

export function currentPanel(): PanelState {
  return panel;
}

export async function rememberPanel(state: PanelState): Promise<void> {
  panel = state;
  await (await getRepository()).putSetting('panel-open', state);
}

export type Provider = 'openrouter' | 'elevenlabs';

export interface ProviderStatus {
  provider: Provider;
  connected: boolean;
  label: string | null;
  detail: string | null;
}

export interface AppleStatus {
  supported: boolean;
  available: boolean;
  reason: string | null;
}

export interface Voice {
  id: string;
  name: string;
  preview_url: string | null;
}

export interface WritingModel {
  id: string;
  name: string;
  free: boolean;
}

export interface Model {
  id: string;
  name: string;
  description: string | null;
}

export interface Connections {
  apple: AppleStatus;
  openrouter: ProviderStatus;
  elevenlabs: ProviderStatus;
}

const absent = (provider: Provider): ProviderStatus => ({
  provider,
  connected: false,
  label: null,
  detail: null,
});

export const BLANK_CONNECTIONS: Connections = {
  apple: {
    supported: false,
    available: false,
    reason: 'Apple Intelligence is available in the macOS app.',
  },
  openrouter: absent('openrouter'),
  elevenlabs: absent('elevenlabs'),
};

function providerStatus(provider: Provider): ProviderStatus {
  return providerKeys[provider]
    ? { provider, connected: true, label: 'Connected', detail: 'Stored in this browser' }
    : absent(provider);
}

export async function readConnections(): Promise<Connections> {
  return {
    apple: BLANK_CONNECTIONS.apple,
    openrouter: providerStatus('openrouter'),
    elevenlabs: providerStatus('elevenlabs'),
  };
}

/** A browser service reads its locally stored key without exposing it to a component. */
export function providerKey(provider: Provider): string | null {
  return providerKeys[provider] ?? null;
}

async function verifyProvider(provider: Provider, key: string): Promise<void> {
  const response = await fetch(
    provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1/auth/key'
      : 'https://api.elevenlabs.io/v1/user',
    {
      headers:
        provider === 'openrouter'
          ? { authorization: `Bearer ${key}` }
          : { 'xi-api-key': key },
    }
  );
  if (!response.ok) throw new Error(`${provider} rejected that key.`);
}

export async function connectProvider(provider: Provider, key: string): Promise<ProviderStatus> {
  const trimmed = key.trim();
  await verifyProvider(provider, trimmed);
  providerKeys = { ...providerKeys, [provider]: trimmed };
  await (await getRepository()).putSetting('provider-keys', providerKeys);
  return providerStatus(provider);
}

export async function forgetProvider(provider: Provider): Promise<boolean> {
  const existed = Boolean(providerKeys[provider]);
  const { [provider]: _removed, ...rest } = providerKeys;
  providerKeys = rest;
  await (await getRepository()).putSetting('provider-keys', providerKeys);
  return existed;
}

async function providerJson<T>(provider: Provider, url: string): Promise<T> {
  const key = providerKeys[provider];
  if (!key) throw new Error(`Connect ${provider} in Settings first.`);
  const response = await fetch(url, {
    headers:
      provider === 'openrouter'
        ? { authorization: `Bearer ${key}` }
        : { 'xi-api-key': key },
  });
  if (!response.ok) throw new Error(`${provider} request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

export async function listVoices(): Promise<Voice[]> {
  const answer = await providerJson<{ voices: Array<{ voice_id: string; name: string; preview_url?: string }> }>(
    'elevenlabs',
    'https://api.elevenlabs.io/v1/voices'
  );
  return answer.voices.map(voice => ({
    id: voice.voice_id,
    name: voice.name,
    preview_url: voice.preview_url ?? null,
  }));
}

export async function listModels(): Promise<Model[]> {
  const rows = await providerJson<
    Array<{ model_id: string; name: string; description?: string }>
  >('elevenlabs', 'https://api.elevenlabs.io/v1/models');
  return rows.map(model => ({
    id: model.model_id,
    name: model.name,
    description: model.description ?? null,
  }));
}

export async function listWritingModels(): Promise<WritingModel[]> {
  const answer = await providerJson<{
    data: Array<{
      id: string;
      name: string;
      pricing?: { prompt?: string; completion?: string };
    }>;
  }>('openrouter', 'https://openrouter.ai/api/v1/models');
  return answer.data.map(model => ({
    id: model.id,
    name: model.name,
    free:
      model.id.endsWith(':free') ||
      (Number(model.pricing?.prompt ?? 1) === 0 && Number(model.pricing?.completion ?? 1) === 0),
  }));
}

export interface AudioOutput {
  uid: string;
  name: string;
}

export async function listOutputs(): Promise<AudioOutput[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  return (await navigator.mediaDevices.enumerateDevices())
    .filter(device => device.kind === 'audiooutput')
    .map(device => ({ uid: device.deviceId, name: device.label || 'Audio output' }));
}

export async function currentOutput(): Promise<string> {
  return selectedOutput;
}

export async function chooseOutput(uid: string): Promise<void> {
  selectedOutput = uid;
  await (await getRepository()).putSetting('audio-output', uid);
}

export interface VirtualMicrophoneStatus {
  active: boolean;
  name: string;
  uid: string;
}

export function isVirtualDeviceAvailable(status: { uid: string } | null | undefined): boolean {
  return Boolean(status && status.uid !== 'unavailable-in-browser');
}

const browserMicrophone: VirtualMicrophoneStatus = {
  active: false,
  name: 'September Microphone',
  uid: 'unavailable-in-browser',
};

export const virtualMicrophoneStatus = async () => browserMicrophone;
export const startVirtualMicrophone = async () => browserMicrophone;
export const stopVirtualMicrophone = async () => browserMicrophone;

export interface VirtualCameraStatus {
  active: boolean;
  pending: boolean;
  name: string;
  uid: string;
  detail: string | null;
}

const browserCamera: VirtualCameraStatus = {
  active: false,
  pending: false,
  name: 'September Camera',
  uid: 'unavailable-in-browser',
  detail: 'The virtual camera is available in the macOS app.',
};

export const virtualCameraStatus = async () => browserCamera;
export const startVirtualCamera = async () => browserCamera;
export const stopVirtualCamera = async () => browserCamera;
export const updateVirtualCameraOverlay = async (_text: string, _visible = true): Promise<void> => {};
