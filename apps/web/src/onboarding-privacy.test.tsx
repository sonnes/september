import React, { act } from 'react';

import { WelcomeStep } from '@september/app-ui/pages/steps';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';

import {
  canReach,
  DEFAULT_DRAFT,
  isSetupDone,
  nextStep,
  previousStep,
  STEPS,
} from '@september/core/rules/onboarding';

import { platform } from './test/platform';

const router = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@tanstack/react-router', async original => ({
  ...(await original<typeof import('@tanstack/react-router')>()),
  useNavigate: () => router.navigate,
}));
vi.mock('@september/app-ui/layouts/onboarding', () => ({
  useDraft: () => ({ draft: { name: '', mode: null }, setDraft: vi.fn() }),
}));
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
let root = createRoot(container);
afterEach(() => {
  act(() => root.unmount());
  root = createRoot(container);
  vi.clearAllMocks();
});
it('shows the summary before personal details', () => {
  expect(STEPS.slice(0, 3).map(step => step.path)).toEqual(['/welcome', '/choose', '/profile']);
  expect(nextStep('/welcome')).toBe('/choose');
  expect(previousStep('/profile')).toBe('/choose');
  expect(canReach('/welcome', { name: '' })).toBe(true);
});
it('opens the full policies without leaving setup and continues to the access step', async () => {
  await act(async () => root.render(<WelcomeStep />));
  const buttons = [...container.querySelectorAll('button')];
  for (const button of buttons.slice(0, -1)) {
    await act(async () => button.click());
  }
  expect(vi.mocked(platform.device.openInBrowser).mock.calls).toEqual([
    ['https://september.to/terms-of-service'],
    ['https://september.to/privacy-policy'],
  ]);

  await act(async () => buttons.at(-1)!.click());
  expect(router.navigate).toHaveBeenCalledWith({ to: '/choose' });
});

it('follows one setup flow without choosing a mode', () => {
  expect(STEPS.map(step => step.path)).toEqual(['/welcome', '/choose', '/profile', '/connect', '/finish']);
  expect(nextStep('/profile')).toBe('/connect');
  expect(previousStep('/connect')).toBe('/profile');
  expect(canReach('/connect', { name: 'Meera' })).toBe(true);
  expect(canReach('/finish', { name: 'Meera' })).toBe(true);
  expect(canReach('/connect', { name: '' })).toBe(false);
  expect(isSetupDone({ ...DEFAULT_DRAFT, name: 'Meera' })).toBe(true);
});
