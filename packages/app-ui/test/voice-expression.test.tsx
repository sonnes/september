import { beforeEach, expect, it, vi } from 'vitest';

import { SpeechSettings } from '@september/app-ui/blocks/speech-settings';
import { savedSpeech } from '@september/app-ui/services/settings';
import type { SpeechSettings as Speech } from '@september/app-ui/services/speech';

import { platform } from './platform';
import { findButton, press, renderPart } from './render';

const speech = (patch: Partial<Speech> = {}): Speech => ({
  provider: 'elevenlabs',
  voiceId: 'voice-1',
  modelId: 'eleven_flash_v2_5',
  stability: 0.5,
  similarity: 0.75,
  speed: 1,
  ...patch,
});

beforeEach(() => {
  vi.mocked(platform.providers.status).mockResolvedValue([
    { provider: 'openrouter', connected: false, label: null, detail: null },
    { provider: 'elevenlabs', connected: true, label: 'Key', detail: null },
  ]);
});

async function render(patch: Partial<Speech> = {}) {
  await savedSpeech.set(speech(patch));
  const rendered = await renderPart(<SpeechSettings />);
  await findButton('Hear it');
  return rendered;
}

/** The button whose text starts with `name`. */
function button(container: HTMLElement, name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll<HTMLButtonElement>('button')].find(one =>
    one.textContent?.startsWith(name),
  );
  if (!found) throw new Error(`No button named ${name}`);
  return found;
}

const found = (container: HTMLElement, name: string) =>
  vi.waitFor(() => button(container, name));

const slider = (container: HTMLElement, label: string) =>
  container.querySelector(`[aria-label="${label}"]`);

const kept = (expected: Partial<Speech>) =>
  vi.waitFor(() => expect(savedSpeech.get()).toEqual(expect.objectContaining(expected)));

it('marks the preset that the saved sound matches', async () => {
  const { container } = await render();
  expect((await found(container, 'Natural')).getAttribute('aria-pressed')).toBe('true');
  expect(slider(container, 'Steadiness')).toBeNull();
});

it('keeps the voice model when a preset is chosen', async () => {
  const { container } = await render({ modelId: 'eleven_multilingual_v2' });
  expect((await found(container, 'Eleven Multilingual v2')).getAttribute('aria-checked')).toBe('true');
  await press(button(container, 'Steady'));
  await kept({ modelId: 'eleven_multilingual_v2', stability: 0.75, similarity: 0.75 });
});

it('keeps the preset when the model changes', async () => {
  const { container } = await render();
  await press(await found(container, 'Expressive'));
  await press(button(container, 'Eleven v3'));
  await kept({ modelId: 'eleven_v3', stability: 0 });
  expect(button(container, 'Expressive').getAttribute('aria-pressed')).toBe('true');
});

it('opens a sound that matches no preset in Custom, with every control', async () => {
  const { container } = await render({ stability: 0.6 });
  expect((await found(container, 'Custom')).getAttribute('aria-pressed')).toBe('true');
  expect(slider(container, 'Steadiness')).not.toBeNull();
  expect(slider(container, 'Likeness')).not.toBeNull();
});

it('shows the three Eleven v3 stability modes and no likeness for Eleven v3', async () => {
  const { container } = await render();
  await press(await found(container, 'Custom'));
  await press(button(container, 'Eleven v3'));
  await kept({ modelId: 'eleven_v3', stability: 0.5 });
  expect(slider(container, 'Likeness')).toBeNull();
  await press(await found(container, 'Creative'));
  await kept({ stability: 0 });
});

it('shows only the speed for the system voice', async () => {
  const { container } = await render({ provider: 'system', voiceId: null });
  expect(slider(container, 'Speed')).not.toBeNull();
  expect(() => button(container, 'Expressive')).toThrow();
});

it('shows the Dialogue models and presets, without the speed or Custom', async () => {
  const { container } = await render({ provider: 'dialogue' });
  await found(container, 'Eleven v3 Conversational');
  expect(button(container, 'Natural').getAttribute('aria-pressed')).toBe('true');
  expect(slider(container, 'Speed')).toBeNull();
  expect(() => button(container, 'Eleven Flash v2.5')).toThrow();
  expect(() => button(container, 'Custom')).toThrow();
  await press(button(container, 'Expressive'));
  await kept({ provider: 'dialogue', stability: 0 });
});

it('saves the Dialogue model and keeps the model of the ElevenLabs voice', async () => {
  const { container } = await render({ provider: 'dialogue' });
  expect((await found(container, 'Eleven v3')).getAttribute('aria-checked')).toBe('true');
  await press(button(container, 'Eleven v3 Conversational'));
  await kept({ dialogueModelId: 'eleven_v3_conversational', modelId: 'eleven_flash_v2_5' });
});

it('names the thumb of every slider', async () => {
  const { container } = await render({ stability: 0.6 });
  await found(container, 'Custom');
  const thumbs = [...container.querySelectorAll('[role="slider"]')];
  expect(thumbs.map(thumb => thumb.getAttribute('aria-label'))).toEqual(['Speed', 'Steadiness', 'Likeness']);
});

it('speaks a sample in the sound in use', async () => {
  const { container } = await render({ speed: 1.2 });
  await press(button(container, 'Hear it'));
  await vi.waitFor(() =>
    expect(platform.voice.stream).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ voiceId: 'voice-1', speed: 1.2 }),
      undefined,
      expect.any(AbortSignal),
    ),
  );
});
