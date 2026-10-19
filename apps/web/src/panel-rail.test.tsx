import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { PanelRail } from '@september/app-ui/blocks/space-panel';
import { InputLayer } from '@september/app-ui/blocks/access';
import { DEFAULT_ACCESS } from '@september/core/rules/access';

vi.mock('@platform/services/os', () => ({
  currentPanel: () => ({ open: false, tab: 'phrases' }),
  rememberPanel: async () => undefined,
  currentSetup: () => null,
  subscribeSetup: () => () => {},
}));
vi.mock('@platform/services/speech', () => ({ useSpeaking: () => null }));
vi.mock('@september/app-ui/blocks/chrome', () => ({ usePanel: () => null }));
vi.mock('@september/app-ui/blocks/phrase-panel', () => ({ Phrases: () => <p>Phrase list</p> }));
vi.mock('@september/app-ui/blocks/speech-settings', () => ({ SpeechSettings: () => <p>Voice settings</p> }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
document.body.append(container);
let root = createRoot(container);
afterEach(() => {
  act(() => root.unmount());
  root = createRoot(container);
});

const railKeys = () => [...container.querySelectorAll<HTMLButtonElement>('nav[aria-label="Panel rail"] button')];

it('names each rail key by the label it shows', async () => {
  await act(async () => root.render(<PanelRail spaceId="space" onInsert={() => {}} />));

  expect(railKeys().map((key) => [key.hasAttribute('aria-label'), key.textContent])).toEqual([
    [false, 'Phrases'],
    [false, 'Voice'],
  ]);
});

it('opens the card of a rail key and marks the key as pressed', async () => {
  await act(async () => root.render(<PanelRail spaceId="space" onInsert={() => {}} />));
  await act(async () => railKeys()[1].click());

  expect(railKeys()[1].getAttribute('aria-pressed')).toBe('true');
  expect(container.querySelector('aside[aria-label="Voice panel"]')?.textContent).toContain('Voice settings');
});

it('scans the rail as one group', async () => {
  await act(async () =>
    root.render(
      <>
        <InputLayer profile={{ ...DEFAULT_ACCESS, input: 'switch' }} />
        <PanelRail spaceId="space" onInsert={() => {}} />
      </>,
    ),
  );
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
  });
  expect(document.querySelector('[data-scan="group"]')?.getAttribute('aria-label')).toBe('Panel rail');
});
