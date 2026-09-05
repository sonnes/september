import React, { act } from 'react';

import { WelcomeStep } from '@september/app-ui/pages/steps';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';

import * as desktop from '../../desktop/src/rules/onboarding';
import * as web from './rules/onboarding';

const platform = vi.hoisted(() => ({ navigate: vi.fn(), open: vi.fn(async () => undefined) }));
vi.mock('@tanstack/react-router', async original => ({
  ...(await original<typeof import('@tanstack/react-router')>()),
  useNavigate: () => platform.navigate,
}));
vi.mock('@september/app-ui/layouts/onboarding', () => ({
  useDraft: () => ({ draft: { name: '', mode: null }, setDraft: vi.fn() }),
}));
vi.mock('@platform/services/os', async original => ({
  ...(await original<typeof import('./services/os')>()),
  openInBrowser: platform.open,
}));
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
let root = createRoot(container);
afterEach(() => {
  act(() => root.unmount());
  root = createRoot(container);
  vi.clearAllMocks();
});
for (const [name, rules] of [
  ['web', web],
  ['desktop', desktop],
] as const) {
  it(`${name}: shows the summary before personal details in either setup mode`, () => {
    for (const mode of ['free', 'advanced'] as const) {
      const draft = { name: '', mode };
      expect(
        rules
          .stepsFor(draft)
          .slice(0, 2)
          .map(step => step.path)
      ).toEqual(['/welcome', '/profile']);
      expect(rules.nextStep('/welcome', draft)).toBe('/profile');
      expect(rules.previousStep('/profile', draft)).toBe('/welcome');
      expect(rules.canReach('/welcome', { name: '', mode: null })).toBe(true);
    }
  });
}
it('opens the full policies without leaving setup and continues to personal details', async () => {
  await act(async () => root.render(<WelcomeStep />));
  const buttons = [...container.querySelectorAll('button')];
  for (const button of buttons.slice(0, -1)) {
    await act(async () => button.click());
  }
  expect(platform.open.mock.calls).toEqual([
    ['https://september.to/terms-of-service'],
    ['https://september.to/privacy-policy'],
  ]);

  await act(async () => buttons.at(-1)!.click());
  expect(platform.navigate).toHaveBeenCalledWith({ to: '/profile' });
});
