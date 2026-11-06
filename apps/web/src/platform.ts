/**
 * The browser platform: IndexedDB, the browser voice, and direct requests to
 * the cloud services. The shared screens reach it as `@platform/adapter`.
 */

import type { Platform } from '@september/app-ui/platform';
import { downloadBlob, warnBeforeUnload } from '@september/app-ui/services/browser';
import { OPENROUTER_BASE } from '@september/core/rules/model-config';

import packageMetadata from '../package.json';
import { audioOutput, chooseAudioOutput } from './services/audio-output';
import { providerKey, providers } from './services/providers';
import { browserRepository } from './services/repository';
import { renderNoteVideo } from './services/video';
import { synthesizeTimed, voice } from './services/voice';

/** Typed as the interface, so shared code sees every optional member. */
export const platform: Platform = {
  app: { source: 'web', version: packageMetadata.version },
  store: browserRepository,
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
    guardUnsavedChanges: warnBeforeUnload,
    save: downloadBlob,
    outputs: {
      async list() {
        if (!navigator.mediaDevices?.enumerateDevices) return [];
        return (await navigator.mediaDevices.enumerateDevices())
          .filter(device => device.kind === 'audiooutput')
          .map(device => ({ uid: device.deviceId, name: device.label || 'Audio output' }));
      },
      current: audioOutput,
      choose: chooseAudioOutput,
    },
    async renderVideo({ text, voice: chosen, tone, onStage }) {
      const { blob, alignment } = await synthesizeTimed(text, chosen);
      return renderNoteVideo({ audio: blob, alignment, tone, onStage });
    },
  },
  capabilities: { dashboard: true, eyeTracker: false, floatingPanel: false },
};
