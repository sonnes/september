import React, { act } from 'react';

import { WritingSettings } from '@september/app-ui/pages/settings';
import { AGENT_MODELS, SUGGESTIONS_MODELS } from '@september/core/rules/model-config';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { setup } from '@september/app-ui/services/settings';
import { DEFAULT_DRAFT, type SavedSetup } from '@september/core/rules/onboarding';

import { platform } from './test/platform';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params: _params, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
    params?: Record<string, string>;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const saved = (): SavedSetup => setup.get()!;

beforeEach(async () => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await setup.set({
    ...DEFAULT_DRAFT,
    id: 'person',
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
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render() {
  await act(async () => root.render(<WritingSettings />));
}

function switches() {
  return [...container.querySelectorAll<HTMLButtonElement>('[role="switch"]')];
}

function section(title: string): HTMLElement {
  const found = [...container.querySelectorAll('section')].find(
    one => one.querySelector('h2')?.textContent === title,
  );
  if (!found) throw new Error(`No section named ${title}`);
  return found;
}

function row(within: HTMLElement, name: string): HTMLButtonElement {
  const found = [...within.querySelectorAll<HTMLButtonElement>('button')].find(button =>
    button.textContent?.startsWith(name),
  );
  if (!found) throw new Error(`No row named ${name}`);
  return found;
}

it('saves the suggestions, phrases, and agent switches independently and retains focus', async () => {
  await render();
  expect(switches()).toHaveLength(3);
  switches()[0].focus();
  await act(async () => switches()[0].click());
  expect(saved()).toMatchObject({ autoSuggestions: false, autoPhrases: true, agentEnabled: true });
  expect(document.activeElement).toBe(switches()[0]);
  await act(async () => switches()[1].click());
  expect(saved()).toMatchObject({ autoSuggestions: false, autoPhrases: false, agentEnabled: true });
  await act(async () => switches()[2].click());
  expect(saved()).toMatchObject({ autoSuggestions: false, autoPhrases: false, agentEnabled: false });
  expect(switches().map(button => button.getAttribute('aria-checked'))).toEqual([
    'false',
    'false',
    'false',
  ]);
});

it('keeps the saved switch value and reports a failed save', async () => {
  await render();
  vi.mocked(platform.store.putSetting).mockRejectedValue(new Error('Storage unavailable'));
  await act(async () => switches()[0].click());
  expect(switches()[0].getAttribute('aria-checked')).toBe('true');
  expect(container.querySelector('[role="alert"]')?.textContent).toBeTruthy();
});

it('saves the suggestions model without changing the agent model', async () => {
  await render();
  const model = SUGGESTIONS_MODELS[0];
  await act(async () => row(section('Suggestions'), model.name).click());
  expect(saved().suggestionsModel).toEqual({ service: 'openrouter', model: model.id });
  expect(saved().defaultModel).toEqual({ service: 'openrouter', model: '' });
});

it('saves the agent and phrases model as the default model', async () => {
  await render();
  const model = AGENT_MODELS[0];
  await act(async () => row(section('Agent and phrases'), model.name).click());
  expect(saved().defaultModel).toEqual({ service: 'openrouter', model: model.id });
});

it('saves Automatic as an empty model', async () => {
  await setup.set({ ...saved(), defaultModel: { service: 'openrouter', model: AGENT_MODELS[0].id } });
  await render();
  await act(async () => row(section('Agent and phrases'), 'Automatic').click());
  expect(saved().defaultModel).toEqual({ service: 'openrouter', model: '' });
});

it('shows a saved model that is not on the list as the chosen first row', async () => {
  await setup.set({ ...saved(), defaultModel: { service: 'openrouter', model: 'vendor/old-model' } });
  await render();
  const chosen = section('Agent and phrases').querySelector('[role="radio"][aria-checked="true"]');
  expect(chosen?.textContent).toContain('vendor/old-model');
});

it('moves both models to a new provider', async () => {
  await setup.set({
    ...saved(),
    suggestionsModel: { service: 'openrouter', model: SUGGESTIONS_MODELS[0].id },
  });
  await render();
  const none = [...section('Provider').querySelectorAll<HTMLButtonElement>('[role="radio"]')].find(
    radio => radio.closest('label')?.textContent?.includes('No AI Assistance'),
  );
  await act(async () => none!.click());
  expect(saved()).toMatchObject({
    defaultModel: { service: 'none', model: '' },
    suggestionsModel: { service: 'none', model: SUGGESTIONS_MODELS[0].id },
  });
  expect(switches()).toHaveLength(0);
});

it('shows the instructions field only for a custom speaking style', async () => {
  await render();
  expect(container.querySelector('textarea')).toBeNull();
  await act(async () => row(section('Speaking style'), 'Custom').click());
  expect(container.querySelector('textarea')).not.toBeNull();
  await act(async () => row(section('Speaking style'), 'Plain').click());
  expect(container.querySelector('textarea')).toBeNull();
});
