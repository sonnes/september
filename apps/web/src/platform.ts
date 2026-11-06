/**
 * The browser platform: IndexedDB, the browser voice, and direct requests to
 * the cloud services. The shared screens reach it as `@platform/adapter`.
 */

import type { Platform, PlatformStore } from '@september/app-ui/platform';
import { SETTINGS } from '@september/core/rules/settings';

import packageMetadata from '../package.json';
import { providerKey, providers } from './services/providers';
import { getRepository } from './services/repository';
import { renderNoteVideo } from './services/video';
import { synthesizeTimed, voice } from './services/voice';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

const repository = getRepository;

/** The store opens the database on its first call. */
const store: PlatformStore = {
  getSetting: async <T,>(key: string) => (await repository()).getSetting<T>(key),
  putSetting: async (key, value) => (await repository()).putSetting(key, value),
  listSpaces: async userId => (await repository()).listSpaces(userId),
  getSpace: async id => (await repository()).getSpace(id),
  putSpace: async space => (await repository()).putSpace(space),
  patchSpace: async patch => (await repository()).patchSpace(patch),
  deleteSpace: async id => (await repository()).deleteSpace(id),
  listMessages: async spaceId => (await repository()).listMessages(spaceId),
  getMessage: async id => (await repository()).getMessage(id),
  putMessage: async message => (await repository()).putMessage(message),
  deleteMessage: async id => (await repository()).deleteMessage(id),
  listAgentMessages: async spaceId => (await repository()).listAgentMessages(spaceId),
  putAgentMessage: async message => (await repository()).putAgentMessage(message),
  updateAgentToolState: async (id, expected, state, content, updatedAt) =>
    (await repository()).updateAgentToolState(id, expected, state, content, updatedAt),
  listNotes: async spaceId => (await repository()).listNotes(spaceId),
  getNote: async id => (await repository()).getNote(id),
  putNote: async note => (await repository()).putNote(note),
  deleteNote: async id => (await repository()).deleteNote(id),
  listPhrases: async spaceId => (await repository()).listPhrases(spaceId),
  putPhrase: async phrase => (await repository()).putPhrase(phrase),
  deletePhrase: async id => (await repository()).deletePhrase(id),
  replaceAiPhrases: async (spaceId, phrases) =>
    (await repository()).replaceAiPhrases(spaceId, phrases),
  putUsageEvent: async event => {
    await (await repository()).putAnalyticsEvent(event);
  },
  listUsageEvents: async (userId, startAt, endAt) =>
    (await repository()).listAnalyticsEvents(userId, startAt, endAt),
  exportBackup: async () => (await repository()).exportBackup(),
  importBackup: async stored => (await repository()).importBackup(stored),
};

/** A browser download. The file never leaves the machine. */
function save(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Typed as the interface, so shared code sees every optional member. */
export const platform: Platform = {
  app: { source: 'web', version: packageMetadata.version },
  store,
  voice,
  providers,
  writing: {
    openrouter: async () => ({ baseUrl: OPENROUTER_BASE, key: await providerKey('openrouter') }),
  },
  device: {
    // The browser knows no name and no login, so setup asks for both.
    identity: async () => ({ name: '', userId: null }),
    openInBrowser: async url => {
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    guardUnsavedChanges() {
      const warn = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue = '';
      };
      window.addEventListener('beforeunload', warn);
      return () => window.removeEventListener('beforeunload', warn);
    },
    save,
    outputs: {
      async list() {
        if (!navigator.mediaDevices?.enumerateDevices) return [];
        return (await navigator.mediaDevices.enumerateDevices())
          .filter(device => device.kind === 'audiooutput')
          .map(device => ({ uid: device.deviceId, name: device.label || 'Audio output' }));
      },
      current: async () => (await store.getSetting<string>(SETTINGS.audioOutput)) ?? '',
      choose: uid => store.putSetting(SETTINGS.audioOutput, uid),
    },
    async renderVideo({ text, voice: chosen, tone, onStage }) {
      const { blob, alignment } = await synthesizeTimed(text, chosen);
      return renderNoteVideo({ audio: blob, alignment, tone, onStage });
    },
  },
  capabilities: { dashboard: true, eyeTracker: false, floatingPanel: false },
};
