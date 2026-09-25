import React, { act } from 'react';

import { SpeechSettings } from '@september/app-ui/blocks/speech-settings';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  speech: {} as Record<string, unknown>,
  save: vi.fn(),
}));
vi.mock('@platform/services/os', async original => {
  const actual = await original<typeof import('./services/os')>();
  return {
    ...actual,
    saveSpeech: state.save,
    readConnections: async () => ({
      ...actual.BLANK_CONNECTIONS,
      elevenlabs: { provider: 'elevenlabs', connected: true, label: 'Key', detail: null },
    }),
  };
});
vi.mock('@platform/services/speech', async original => ({
  ...(await original<typeof import('./services/speech')>()),
  speechSettings: () => state.speech,
  speak: vi.fn(),
}));
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
  state.save.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render() {
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
  expect(button('Eleven Multilingual v2').getAttribute('aria-current')).toBe('true');
  await act(async () => button('Steady').click());
  expect(state.save).toHaveBeenLastCalledWith(
    expect.objectContaining({ modelId: 'eleven_multilingual_v2', stability: 0.75, similarity: 0.75 }),
  );
});

it('keeps the preset when the model changes', async () => {
  await render();
  await act(async () => button('Expressive').click());
  await act(async () => button('Eleven v3').click());
  expect(state.save).toHaveBeenLastCalledWith(
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
  expect(state.save).toHaveBeenLastCalledWith(
    expect.objectContaining({ modelId: 'eleven_v3', stability: 0.5 }),
  );
  expect(slider('Likeness')).toBeNull();
  await act(async () => button('Creative').click());
  expect(state.save).toHaveBeenLastCalledWith(expect.objectContaining({ stability: 0 }));
});

it('shows only the speed for the system voice', async () => {
  state.speech.provider = 'system';
  await render();
  expect(slider('Speed')).not.toBeNull();
  expect(container.textContent).not.toContain('Expressive');
});
