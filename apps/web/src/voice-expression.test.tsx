import React, { act } from 'react';

import { SpeechSettings } from '@september/app-ui/blocks/speech-settings';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';


import { savedSpeech } from '@september/app-ui/services/settings';

import { platform } from './test/platform';

vi.mock('@september/app-ui/services/speech', async original => ({
  ...(await original<typeof import('@september/app-ui/services/speech')>()),
  speak: vi.fn(),
}));

const state = { speech: {} as Record<string, unknown> };
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// The slider measures itself, and jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  state.speech = {
    provider: 'elevenlabs',
    voiceId: 'voice-1',
    modelId: 'eleven_flash_v2_5',
    stability: 0.5,
    similarity: 0.75,
    speed: 1,
  };
  vi.mocked(platform.providers.status).mockResolvedValue([
    { provider: 'openrouter', connected: false, label: null, detail: null },
    { provider: 'elevenlabs', connected: true, label: 'Key', detail: null },
  ]);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render() {
  await savedSpeech.set(state.speech as never);
  await act(async () => root.render(<SpeechSettings />));
}

function button(name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll<HTMLButtonElement>('button')].find(one =>
    one.textContent?.startsWith(name),
  );
  if (!found) throw new Error(`No button named ${name}`);
  return found;
}

const slider = (label: string) => container.querySelector(`[aria-label="${label}"]`);

it('marks the preset that the saved sound matches', async () => {
  await render();
  expect(button('Natural').getAttribute('aria-pressed')).toBe('true');
  expect(slider('Steadiness')).toBeNull();
});

it('shows the voice model with a preset and keeps it when a preset is chosen', async () => {
  state.speech.modelId = 'eleven_multilingual_v2';
  await render();
  expect(button('Eleven Multilingual v2').getAttribute('aria-checked')).toBe('true');
  await act(async () => button('Steady').click());
  expect(savedSpeech.get()).toEqual(
    expect.objectContaining({ modelId: 'eleven_multilingual_v2', stability: 0.75, similarity: 0.75 }),
  );
});

it('keeps the preset when the model changes', async () => {
  await render();
  await act(async () => button('Expressive').click());
  await act(async () => button('Eleven v3').click());
  expect(savedSpeech.get()).toEqual(
    expect.objectContaining({ modelId: 'eleven_v3', stability: 0 }),
  );
  expect(button('Expressive').getAttribute('aria-pressed')).toBe('true');
});

it('opens a sound that matches no preset in Custom, with every control', async () => {
  state.speech.stability = 0.6;
  await render();
  expect(button('Custom').getAttribute('aria-pressed')).toBe('true');
  expect(slider('Steadiness')).not.toBeNull();
  expect(slider('Likeness')).not.toBeNull();
});

it('shows the three Eleven v3 stability modes and no likeness for Eleven v3', async () => {
  await render();
  await act(async () => button('Custom').click());
  await act(async () => button('Eleven v3').click());
  expect(savedSpeech.get()).toEqual(
    expect.objectContaining({ modelId: 'eleven_v3', stability: 0.5 }),
  );
  expect(slider('Likeness')).toBeNull();
  await act(async () => button('Creative').click());
  expect(savedSpeech.get()).toEqual(expect.objectContaining({ stability: 0 }));
});

it('shows only the speed for the system voice', async () => {
  state.speech.provider = 'system';
  await render();
  expect(slider('Speed')).not.toBeNull();
  expect(container.textContent).not.toContain('Expressive');
});

it('shows the two Dialogue models and the three presets, without the speed or Custom, for the Dialogue voice', async () => {
  state.speech.provider = 'dialogue';
  await render();
  expect(button('Eleven v3 Conversational')).toBeDefined();
  expect(button('Natural').getAttribute('aria-pressed')).toBe('true');
  expect(slider('Speed')).toBeNull();
  expect(container.textContent).not.toContain('Eleven Flash v2.5');
  expect(container.textContent).not.toContain('Custom');
  await act(async () => button('Expressive').click());
  expect(savedSpeech.get()).toEqual(
    expect.objectContaining({ provider: 'dialogue', stability: 0 }),
  );
});

it('saves the Dialogue model and keeps the model of the ElevenLabs voice', async () => {
  state.speech.provider = 'dialogue';
  await render();
  expect(button('Eleven v3').getAttribute('aria-checked')).toBe('true');
  await act(async () => button('Eleven v3 Conversational').click());
  expect(savedSpeech.get()).toEqual(
    expect.objectContaining({ dialogueModelId: 'eleven_v3_conversational', modelId: 'eleven_flash_v2_5' }),
  );
});

it('names the thumb of every slider', async () => {
  state.speech.stability = 0.6;
  await render();
  const thumbs = [...container.querySelectorAll('[role="slider"]')];
  expect(thumbs.map(thumb => thumb.getAttribute('aria-label'))).toEqual(['Speed', 'Steadiness', 'Likeness']);
});
