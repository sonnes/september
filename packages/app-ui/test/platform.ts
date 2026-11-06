/**
 * An in-memory platform for tests of the shared screens and services.
 *
 * Every member is a `vi.fn`, so a test can read the calls or replace one
 * answer. `resetPlatform` empties the rows and the settings and restores the
 * default answers. Vitest maps `@platform/adapter` to this file.
 */

import { vi } from 'vitest';

import type { Platform, PlatformStore, ProviderStatus } from '@september/app-ui/platform';
import type { StoredBackup } from '@september/core/rules/backup';
import type {
  AgentMessage,
  Message,
  Note,
  SavedPhrase,
  Space,
} from '@september/core/rules/records';
import type { UsageEvent } from '@september/core/rules/usage-summary';

interface Rows {
  settings: Map<string, unknown>;
  spaces: Map<string, Space>;
  messages: Map<string, Message>;
  agentMessages: Map<string, AgentMessage>;
  notes: Map<string, Note>;
  phrases: Map<string, SavedPhrase>;
  usage: Map<string, UsageEvent>;
}

export const rows: Rows = {
  settings: new Map(),
  spaces: new Map(),
  messages: new Map(),
  agentMessages: new Map(),
  notes: new Map(),
  phrases: new Map(),
  usage: new Map(),
};

const inSpace = <T extends { space_id?: string }>(map: Map<string, T>, spaceId?: string) =>
  [...map.values()].filter(row => spaceId === undefined || row.space_id === spaceId);

const remove = (map: Map<string, unknown>, id: string) => map.delete(id);

function storeDefaults(): PlatformStore {
  return {
    getSetting: async <T>(key: string) => (rows.settings.get(key) as T | undefined) ?? null,
    putSetting: async (key, value) => {
      rows.settings.set(key, value);
    },
    listSpaces: async userId => [...rows.spaces.values()].filter(row => row.user_id === userId),
    getSpace: async id => rows.spaces.get(id) ?? null,
    putSpace: async space => (rows.spaces.set(space.id, space), space),
    patchSpace: async patch => {
      const held = rows.spaces.get(patch.id);
      if (!held) throw new Error('That space is gone.');
      const next = { ...held, ...patch } as Space;
      rows.spaces.set(next.id, next);
      return next;
    },
    deleteSpace: async id => remove(rows.spaces, id),
    listMessages: async spaceId => inSpace(rows.messages, spaceId),
    getMessage: async id => rows.messages.get(id) ?? null,
    putMessage: async message => (rows.messages.set(message.id, message), message),
    deleteMessage: async id => remove(rows.messages, id),
    listAgentMessages: async spaceId => inSpace(rows.agentMessages, spaceId),
    putAgentMessage: async message => (rows.agentMessages.set(message.id, message), message),
    updateAgentToolState: async (id, expected, state, content, updatedAt) => {
      const held = rows.agentMessages.get(id);
      if (!held) throw new Error('That agent request is gone.');
      if (held.tool_state !== expected) throw new Error('That agent request was already resolved.');
      const next = { ...held, tool_state: state, content, updated_at: updatedAt };
      rows.agentMessages.set(id, next);
      return next;
    },
    listNotes: async spaceId => inSpace(rows.notes, spaceId),
    getNote: async id => rows.notes.get(id) ?? null,
    putNote: async note => (rows.notes.set(note.id, note), note),
    deleteNote: async id => remove(rows.notes, id),
    listPhrases: async spaceId => inSpace(rows.phrases, spaceId),
    putPhrase: async phrase => (rows.phrases.set(phrase.id, phrase), phrase),
    deletePhrase: async id => remove(rows.phrases, id),
    replaceAiPhrases: async (spaceId, phrases) => {
      for (const row of inSpace(rows.phrases, spaceId)) {
        if (!row.pinned) rows.phrases.delete(row.id);
      }
      for (const phrase of phrases) rows.phrases.set(phrase.id, phrase);
    },
    putUsageEvent: async event => {
      rows.usage.set(event.id, event);
    },
    listUsageEvents: async (userId, startAt, endAt) =>
      [...rows.usage.values()].filter(
        event => event.user_id === userId && event.timestamp >= startAt && event.timestamp <= endAt
      ),
    exportBackup: async (): Promise<StoredBackup> => ({
      settings: Object.fromEntries(rows.settings),
      spaces: [...rows.spaces.values()],
      messages: [...rows.messages.values()],
      agentMessages: [...rows.agentMessages.values()],
      notes: [...rows.notes.values()],
      savedPhrases: [...rows.phrases.values()],
      usageEvents: [...rows.usage.values()],
    }),
    importBackup: async () => {},
  };
}

const absent = (provider: ProviderStatus['provider']): ProviderStatus => ({
  provider,
  connected: false,
  label: null,
  detail: null,
});

function defaults(): Platform {
  return {
    app: { source: 'web', version: '0.0.0' },
    store: storeDefaults(),
    voice: {
      systemName: 'test system voice',
      systemDescription: 'The voice of this device.',
      speakSystem: async () => {},
      stream: async () => ({ fromCache: false, latencyMs: 0 }),
      stop: async () => {},
      synthesize: async () => new Blob(),
    },
    providers: {
      status: async () => [absent('openrouter'), absent('elevenlabs')],
      connect: async provider => ({ ...absent(provider), connected: true, label: 'Connected' }),
      connectOpenRouter: async () => ({ ...absent('openrouter'), connected: true }),
      forget: async () => true,
      voices: async () => [],
      quota: async () => null,
      cloneVoice: async () => ({ id: 'cloned' }),
    },
    writing: {
      openrouter: async () => ({ baseUrl: 'https://openrouter.test/api/v1', key: 'test-key' }),
    },
    device: {
      identity: async () => ({ name: '', userId: null }),
      openInBrowser: async () => {},
      guardUnsavedChanges: () => () => {},
      save: () => {},
      outputs: {
        list: async () => [],
        current: async () => '',
        choose: async () => {},
      },
    },
    capabilities: { dashboard: true, eyeTracker: false, floatingPanel: false },
  };
}

/** Wraps each function of an object in `vi.fn`, at any depth. */
function mocked<T extends object>(source: T): T {
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'function') {
      (source as Record<string, unknown>)[key] = vi.fn(value as (...args: unknown[]) => unknown);
    } else if (value && typeof value === 'object' && !(value instanceof Map)) {
      mocked(value as object);
    }
  }
  return source;
}

/** The platform the shared code sees. Its object identity never changes. */
export const platform: Platform = mocked(defaults());

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !(value instanceof Map);

/**
 * Makes `target` match `fresh` in place, so the objects that the shared code
 * holds stay the same. A member that a test added and `fresh` lacks goes away.
 */
function restore(target: Record<string, unknown>, fresh: Record<string, unknown>): void {
  for (const key of Object.keys(target)) if (!(key in fresh)) delete target[key];
  for (const [key, value] of Object.entries(fresh)) {
    const held = target[key];
    if (isRecord(held) && isRecord(value)) restore(held, value);
    else target[key] = value;
  }
}

/** Empties the rows and gives every member its default answer again. */
export function resetPlatform(): void {
  for (const map of Object.values(rows)) map.clear();
  restore(platform as unknown as Record<string, unknown>, mocked(defaults()) as unknown as Record<string, unknown>);
}
