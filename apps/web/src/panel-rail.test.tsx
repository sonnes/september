import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PanelRail } from '@september/app-ui/blocks/space-panel';
import { InputLayer } from '@september/app-ui/blocks/access';
import { DEFAULT_ACCESS } from '@september/core/rules/access';
import { HeaderActionsSlot } from '@september/app-ui/blocks/screen';

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

describe('on a phone', () => {
  const header = document.createElement('div');
  document.body.append(header);
  const wide = window.innerWidth;

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: wide });
  });

  async function renderPhone() {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    await act(async () =>
      root.render(
        <HeaderActionsSlot.Provider value={{ slot: header, setSlot: () => {} }}>
          <PanelRail spaceId="space" onInsert={() => {}} />
        </HeaderActionsSlot.Provider>,
      ),
    );
  }
  const headerKey = (name: string) =>
    [...header.querySelectorAll<HTMLButtonElement>('button')].find((key) => key.textContent === name);

  it('puts the rail keys in the screen header', async () => {
    await renderPhone();

    expect([...header.querySelectorAll('button')].map((key) => key.textContent)).toEqual(['Phrases', 'Voice']);
  });

  it('opens a key as a sheet over the screen, and gives the focus back on close', async () => {
    await renderPhone();
    await act(async () => headerKey('Phrases')!.focus());
    await act(async () => headerKey('Phrases')!.click());

    const sheet = document.querySelector('[role="dialog"]');
    expect(sheet?.textContent).toContain('Phrase list');
    expect(headerKey('Phrases')!.getAttribute('aria-pressed')).toBe('true');

    await act(async () => [...sheet!.querySelectorAll('button')].find((key) => key.textContent?.includes('Close'))!.click());
    // The sheet gives the focus back after it leaves the page.
    await act(async () => new Promise((done) => setTimeout(done, 0)));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(headerKey('Phrases'));
  });
});
