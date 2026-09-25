import React, { act } from 'react';

import { VoiceScreen } from '@september/app-ui/pages/voice';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  heard: [] as string[],
  rememberHeard: vi.fn(),
  save: vi.fn(),
  play: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}));
vi.mock('@september/app-ui/blocks/screen', () => ({
  Screen: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@platform/services/player', () => ({ play: state.play }));
vi.mock('@platform/services/os', async original => {
  const actual = await original<typeof import('./services/os')>();
  return {
    ...actual,
    heardVoiceIds: state.heard,
    rememberHeardVoices: state.rememberHeard,
    saveSpeech: state.save,
    readConnections: async () => ({
      ...actual.BLANK_CONNECTIONS,
      elevenlabs: { provider: 'elevenlabs', connected: true, label: 'Key', detail: null },
    }),
    listVoices: async () => [
      { id: 'roger', name: 'Roger - Laid-Back, Casual', preview_url: 'https://x/roger.mp3', category: 'premade' },
      { id: 'mine', name: 'My voice', preview_url: null, category: 'cloned' },
      { id: 'alice', name: 'Alice - Clear, Engaging', preview_url: 'https://x/alice.mp3', category: 'premade' },
    ],
  };
});
vi.mock('@platform/services/speech', async original => ({
  ...(await original<typeof import('./services/speech')>()),
  speechSettings: () => ({
    provider: 'elevenlabs',
    voiceId: 'alice',
    modelId: 'eleven_flash_v2_5',
    stability: 0.5,
    similarity: 0.75,
    speed: 1,
  }),
  speak: vi.fn(),
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  state.heard.splice(0);
  state.rememberHeard.mockReset().mockResolvedValue(undefined);
  state.save.mockReset().mockResolvedValue(undefined);
  state.play.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render() {
  await act(async () => root.render(<VoiceScreen />));
}

/** The group headings and the voice names, in the order the list shows them. */
function listed(): string[] {
  const list = container.querySelector('[aria-label="Voices"]');
  return [...(list?.querySelectorAll('[data-group], [data-row-name]') ?? [])].map(
    item => item.textContent ?? '',
  );
}

it('shows the voices of the user first, then the ElevenLabs voices by name', async () => {
  await render();
  expect(listed()).toEqual(['Yours', 'My voice', 'ElevenLabs voices', 'Alice', 'Roger']);
});

it('shows the description of a voice under its name', async () => {
  await render();
  expect(container.textContent).toContain('Laid-Back, Casual');
});

it('saves a voice the user hears without moving the row under them', async () => {
  await render();
  const hear = container.querySelector<HTMLButtonElement>('[aria-label="Hear Roger - Laid-Back, Casual"]');
  await act(async () => hear!.click());
  expect(state.play).toHaveBeenCalledWith('https://x/roger.mp3');
  expect(state.rememberHeard).toHaveBeenCalledWith(['roger']);
  expect(listed()).toEqual(['Yours', 'My voice', 'ElevenLabs voices', 'Alice', 'Roger']);
});

it('lists the voices heard on an earlier visit under Heard lately', async () => {
  state.heard.push('roger');
  await render();
  expect(listed()).toEqual(['Yours', 'My voice', 'Heard lately', 'Roger', 'ElevenLabs voices', 'Alice']);
});

it('marks the voice in use and saves a new choice', async () => {
  await render();
  const chosen = container.querySelector('[aria-current="true"]');
  expect(chosen?.textContent).toContain('Alice');
  const roger = [...container.querySelectorAll<HTMLButtonElement>('[data-row-name]')].find(
    name => name.textContent === 'Roger',
  );
  await act(async () => roger!.closest('button')!.click());
  expect(state.save).toHaveBeenLastCalledWith(expect.objectContaining({ voiceId: 'roger' }));
});

it('offers the Dialogue voice and keeps the voice list for it', async () => {
  await render();
  const choice = container.querySelector<HTMLButtonElement>('button[value="dialogue"]');
  expect(choice).not.toBeNull();
  await act(async () => choice!.click());
  expect(state.save).toHaveBeenLastCalledWith(expect.objectContaining({ provider: 'dialogue' }));
  expect(listed().length).toBeGreaterThan(0);
});
