import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { heardVoices, savedSpeech } from '@september/app-ui/services/settings';

import { platform } from './platform';
import { findButton, finishSetup, press, renderApp } from './render';

const played: string[] = [];

beforeEach(async () => {
  played.length = 0;
  vi.stubGlobal(
    'Audio',
    class {
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(url: string) {
        played.push(url);
      }
      pause() {}
      async play() {}
    },
  );
  await finishSetup();
  await savedSpeech.set({
    provider: 'elevenlabs',
    voiceId: 'alice',
    modelId: 'eleven_flash_v2_5',
    stability: 0.5,
    similarity: 0.75,
    speed: 1,
  });
  vi.mocked(platform.providers.status).mockResolvedValue([
    { provider: 'openrouter', connected: false, label: null, detail: null },
    { provider: 'elevenlabs', connected: true, label: 'Key', detail: null },
  ]);
  vi.mocked(platform.providers.voices).mockResolvedValue([
    { id: 'roger', name: 'Roger - Laid-Back, Casual', preview_url: 'https://x/roger.mp3', category: 'premade' },
    { id: 'mine', name: 'My voice', preview_url: null, category: 'cloned' },
    { id: 'alice', name: 'Alice - Clear, Engaging', preview_url: 'https://x/alice.mp3', category: 'premade' },
  ]);
});

afterEach(() => vi.unstubAllGlobals());

/** The group headings and the voice names, in the order the list shows them. */
function listed(container: HTMLElement): string[] {
  const list = container.querySelector('[aria-label="Voices"]');
  return [...(list?.querySelectorAll('[data-group], [data-row-name]') ?? [])].map(
    item => item.textContent ?? '',
  );
}

async function render() {
  const rendered = await renderApp('/voice');
  await vi.waitFor(() => expect(listed(rendered.container).length).toBeGreaterThan(0));
  return rendered;
}

it('shows the voices of the user first, then the ElevenLabs voices by name', async () => {
  const { container } = await render();
  expect(listed(container)).toEqual(['Yours', 'My voice', 'ElevenLabs voices', 'Alice', 'Roger']);
});

it('shows the description of a voice under its name', async () => {
  const { container } = await render();
  expect(container.querySelector('[aria-label="Voices"]')?.textContent).toContain('Laid-Back, Casual');
});

it('plays the sample a person hears and keeps the voice without moving its row', async () => {
  const { container } = await render();
  await press(await findButton('Hear Roger - Laid-Back, Casual', container));
  expect(played).toEqual(['https://x/roger.mp3']);
  await vi.waitFor(() => expect(heardVoices.get()).toEqual(['roger']));
  expect(listed(container)).toEqual(['Yours', 'My voice', 'ElevenLabs voices', 'Alice', 'Roger']);
});

it('lists the voices heard on an earlier visit under Heard lately', async () => {
  await heardVoices.set(['roger']);
  const { container } = await render();
  expect(listed(container)).toEqual(['Yours', 'My voice', 'Heard lately', 'Roger', 'ElevenLabs voices', 'Alice']);
});

it('marks the voice in use and saves a new choice', async () => {
  const { container } = await render();
  const chosen = container.querySelector('[aria-label="Voices"] [role="radio"][aria-checked="true"]');
  expect(chosen?.textContent).toContain('Alice');
  const roger = [...container.querySelectorAll('[data-row-name]')].find(name => name.textContent === 'Roger');
  await press(roger!.closest('button')!);
  await vi.waitFor(() => expect(savedSpeech.get()).toEqual(expect.objectContaining({ voiceId: 'roger' })));
});

it('shows who speaks as choices, with the one in use checked', async () => {
  const { container } = await render();
  const group = container.querySelector('[role="radiogroup"][aria-label="Who speaks"]');
  const checked = [...(group?.querySelectorAll('[role="radio"][aria-checked="true"]') ?? [])];
  expect(checked.map(one => one.textContent)).toEqual([expect.stringContaining('ElevenLabs')]);
});

it('offers the Dialogue voice and keeps the voice list for it', async () => {
  const { container } = await render();
  const choice = container.querySelector<HTMLButtonElement>('button[value="dialogue"]');
  expect(choice).not.toBeNull();
  await press(choice!);
  await vi.waitFor(() => expect(savedSpeech.get()).toEqual(expect.objectContaining({ provider: 'dialogue' })));
  expect(listed(container)).toEqual(['Yours', 'My voice', 'ElevenLabs voices', 'Alice', 'Roger']);
});

it('speaks a sample in the voice in use', async () => {
  const { container } = await render();
  await press(await findButton('Hear it', container));
  await vi.waitFor(() =>
    expect(platform.voice.stream).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ voiceId: 'alice' }),
      undefined,
      expect.any(AbortSignal),
    ),
  );
});

it('offers the source of the voice samples as a choice of two', async () => {
  const { container } = await renderApp('/voice/clone');
  const choices = () => [
    ...container.querySelectorAll<HTMLButtonElement>(
      '[role="radiogroup"][aria-label="Voice sample source"] [role="radio"]',
    ),
  ];
  await vi.waitFor(() => expect(choices()).toHaveLength(2));
  expect(choices().map(one => [one.textContent, one.getAttribute('aria-checked')])).toEqual([
    ['Upload audio', 'true'],
    ['Record now', 'false'],
  ]);

  await press(choices()[1]!);
  expect(choices()[1]!.getAttribute('aria-checked')).toBe('true');
});

it('names the file field of the voice samples', async () => {
  const { container } = await renderApp('/voice/clone');
  const field = await vi.waitFor(() => {
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('No file field');
    return input;
  });
  expect(field.getAttribute('aria-label') || field.labels?.[0]?.textContent).toBeTruthy();
});
