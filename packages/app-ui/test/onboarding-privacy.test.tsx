import { expect, it, vi } from 'vitest';

import { stepFor } from '@september/core/rules/onboarding';

import { platform } from './platform';
import { findButton, press, renderApp } from './render';

it('opens the full policies without leaving setup and continues to the access step', async () => {
  const { container, router } = await renderApp('/welcome');

  await press(await findButton('Terms of Service', container));
  await press(await findButton('Privacy Policy', container));
  expect(vi.mocked(platform.device.openInBrowser).mock.calls).toEqual([
    ['https://september.to/terms-of-service'],
    ['https://september.to/privacy-policy'],
  ]);
  expect(router!.state.location.pathname).toBe('/welcome');

  await press(await findButton(stepFor('/welcome').action, container));
  await vi.waitFor(() => expect(router!.state.location.pathname).toBe('/choose'));
});
