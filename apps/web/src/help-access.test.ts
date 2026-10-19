// @vitest-environment jsdom
import 'fake-indexeddb/auto';

import { createMemoryHistory } from '@tanstack/react-router';
import { expect, it } from 'vitest';

import { getRouter } from './router';
import { getRepository } from './services/repository';
import { currentSetup } from './services/os';

// Help is public, so it has no setup guard. A person who opens a guide
// directly still sees it at the size and in the theme of their profile.
it('reads the saved access profile when Help is the first page', async () => {
  const repository = await getRepository();
  await repository.putSetting('setup', { name: 'Meera', access: { input: 'eyes', theme: 'dark' } });

  const router = getRouter(createMemoryHistory({ initialEntries: ['/help'] }));
  await router.load();

  expect(router.state.location.pathname).toBe('/help');
  expect(currentSetup()).toMatchObject({ access: { input: 'eyes', theme: 'dark' } });
});
