import { beforeEach, expect, it, vi } from 'vitest';

import { setup } from '@september/app-ui/services/settings';
import { AGENT_MODELS, SUGGESTIONS_MODELS } from '@september/core/rules/model-config';
import type { SavedSetup } from '@september/core/rules/onboarding';

import { platform } from './platform';
import { finishSetup, press, renderApp } from './render';

const saved = (): SavedSetup => setup.get()!;

beforeEach(async () => {
  await finishSetup({
    defaultModel: { service: 'openrouter', model: '' },
    suggestionsModel: null,
    autoSuggestions: true,
    autoPhrases: true,
    agentEnabled: true,
  });
  vi.mocked(platform.providers.status).mockResolvedValue([
    { provider: 'openrouter', connected: true, label: 'Key', detail: null },
    { provider: 'elevenlabs', connected: false, label: null, detail: null },
  ]);
});

async function open() {
  const { container } = await renderApp('/settings/writing');
  await vi.waitFor(() => {
    if (!section('Provider', container)) throw new Error('No writing settings');
  });
  return container;
}

const switches = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLButtonElement>('[role="switch"]'),
];

function section(title: string, container: HTMLElement): HTMLElement | undefined {
  return [...container.querySelectorAll<HTMLElement>('section')].find(
    one => one.querySelector('h2')?.textContent === title,
  );
}

function row(within: HTMLElement | undefined, name: string): HTMLButtonElement {
  const found = [...(within?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(button =>
    button.textContent?.startsWith(name),
  );
  if (!found) throw new Error(`No row named ${name}`);
  return found;
}

it('saves the suggestions, phrases, and agent switches apart and keeps the focus', async () => {
  const container = await open();
  expect(switches(container)).toHaveLength(3);
  switches(container)[0].focus();
  await press(switches(container)[0]);
  await vi.waitFor(() =>
    expect(saved()).toMatchObject({ autoSuggestions: false, autoPhrases: true, agentEnabled: true }),
  );
  expect(document.activeElement).toBe(switches(container)[0]);
  await press(switches(container)[1]);
  await vi.waitFor(() =>
    expect(saved()).toMatchObject({ autoSuggestions: false, autoPhrases: false, agentEnabled: true }),
  );
  await press(switches(container)[2]);
  await vi.waitFor(() =>
    expect(saved()).toMatchObject({ autoSuggestions: false, autoPhrases: false, agentEnabled: false }),
  );
  expect(switches(container).map(button => button.getAttribute('aria-checked'))).toEqual([
    'false',
    'false',
    'false',
  ]);
});

it('keeps the saved switch value and reports a failed save', async () => {
  const container = await open();
  vi.mocked(platform.store.putSetting).mockRejectedValue(new Error('Storage unavailable'));
  await press(switches(container)[0]);
  await vi.waitFor(() => expect(container.querySelector('[role="alert"]')).not.toBeNull());
  expect(switches(container)[0].getAttribute('aria-checked')).toBe('true');
  expect(saved().autoSuggestions).toBe(true);
});

it('keeps a switch that changes while a model choice is still saving', async () => {
  const container = await open();
  const put = vi.mocked(platform.store.putSetting);
  const write = put.getMockImplementation()!;
  let release!: () => void;
  put.mockImplementationOnce(
    (key, value) => new Promise<void>(done => (release = () => void write(key, value).then(done))),
  );
  await press(row(section('Agent and phrases', container), AGENT_MODELS[0].name));
  await press(switches(container)[0]);
  await press(row(section('Agent and phrases', container), AGENT_MODELS[1].name));
  release();

  await vi.waitFor(() =>
    expect(saved().defaultModel).toEqual({ service: 'openrouter', model: AGENT_MODELS[1].id }),
  );
  expect(saved().autoSuggestions).toBe(false);
});

it('saves the suggestions model without changing the agent model', async () => {
  const container = await open();
  const model = SUGGESTIONS_MODELS[0];
  await press(row(section('Suggestions', container), model.name));
  await vi.waitFor(() =>
    expect(saved().suggestionsModel).toEqual({ service: 'openrouter', model: model.id }),
  );
  expect(saved().defaultModel).toEqual({ service: 'openrouter', model: '' });
});

it('saves the agent and phrases model as the default model', async () => {
  const container = await open();
  const model = AGENT_MODELS[0];
  await press(row(section('Agent and phrases', container), model.name));
  await vi.waitFor(() =>
    expect(saved().defaultModel).toEqual({ service: 'openrouter', model: model.id }),
  );
});

it('saves Automatic as an empty model', async () => {
  await setup.set({ ...saved(), defaultModel: { service: 'openrouter', model: AGENT_MODELS[0].id } });
  const container = await open();
  await press(row(section('Agent and phrases', container), 'Automatic'));
  await vi.waitFor(() => expect(saved().defaultModel).toEqual({ service: 'openrouter', model: '' }));
});

it('shows a saved model that is not on the list as the chosen row', async () => {
  await setup.set({ ...saved(), defaultModel: { service: 'openrouter', model: 'vendor/old-model' } });
  const container = await open();
  const chosen = section('Agent and phrases', container)?.querySelector(
    '[role="radio"][aria-checked="true"]',
  );
  expect(chosen?.textContent).toContain('vendor/old-model');
});

it('moves both models to a new provider', async () => {
  await setup.set({
    ...saved(),
    suggestionsModel: { service: 'openrouter', model: SUGGESTIONS_MODELS[0].id },
  });
  const container = await open();
  const none = [
    ...(section('Provider', container)?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? []),
  ].find(radio => radio.closest('label')?.textContent?.includes('No AI Assistance'));
  await press(none!);
  await vi.waitFor(() =>
    expect(saved()).toMatchObject({
      defaultModel: { service: 'none', model: '' },
      suggestionsModel: { service: 'none', model: SUGGESTIONS_MODELS[0].id },
    }),
  );
  expect(switches(container)).toHaveLength(0);
});

it('does not move to a provider that is not connected', async () => {
  vi.mocked(platform.providers.status).mockResolvedValue([
    { provider: 'openrouter', connected: false, label: null, detail: null },
    { provider: 'elevenlabs', connected: false, label: null, detail: null },
  ]);
  await setup.set({ ...saved(), defaultModel: { service: 'none', model: '' } });
  const container = await open();
  const openrouter = [
    ...(section('Provider', container)?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? []),
  ].find(radio => radio.closest('label')?.textContent?.includes('OpenRouter'));
  await press(openrouter!);
  expect(saved().defaultModel).toEqual({ service: 'none', model: '' });
});

it('shows the instructions field only for a custom speaking style', async () => {
  const container = await open();
  expect(container.querySelector('textarea')).toBeNull();
  await press(row(section('Speaking style', container), 'Custom'));
  expect(container.querySelector('textarea')).not.toBeNull();
  await press(row(section('Speaking style', container), 'Plain'));
  expect(container.querySelector('textarea')).toBeNull();
});
