import { createMemoryHistory } from '@tanstack/react-router';
import { expect, it, vi } from 'vitest';

import { platform, rows } from '@september/app-ui/test/platform';
import { APP_NAV } from '@september/app-ui/navigation';
import { DEFAULT_DRAFT } from '@september/core/rules/onboarding';
import { SETTINGS } from '@september/core/rules/settings';

import { PUBLIC_PAGES } from './public-pages';
import { getRouter } from './router';

it('opens a public page without reading the settings, and reads them before an app page', async () => {
  // A setup another tab finished: it is stored, but this page has not read it.
  const { voiceService: _voiceService, ...answers } = DEFAULT_DRAFT;
  rows.settings.set(SETTINGS.setup, { ...answers, name: 'Meera', id: 'local-user' });
  vi.mocked(platform.store.getSetting).mockClear();
  vi.mocked(platform.device.identity).mockClear();

  for (const path of Object.keys(PUBLIC_PAGES)) {
    const opened = getRouter(createMemoryHistory({ initialEntries: [path] }));
    await opened.load();
    expect(opened.state.location.pathname).toBe(path);
  }
  expect(platform.store.getSetting).not.toHaveBeenCalled();
  expect(platform.device.identity).not.toHaveBeenCalled();

  const router = getRouter(createMemoryHistory({ initialEntries: ['/privacy-policy'] }));
  await router.load();
  await router.navigate({ to: APP_NAV[0].path });
  expect(router.state.location.pathname).toBe(APP_NAV[0].path);
});
