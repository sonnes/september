// @vitest-environment jsdom
import { createMemoryHistory } from '@tanstack/react-router';
import { beforeEach, describe, expect, it } from 'vitest';

import { loadSettings, saveSetup } from '@september/app-ui/services/settings';
import { DEFAULT_DRAFT } from '@september/core/rules/onboarding';

import { getRouter } from './router';

/** Where the router settles when it is asked for a path. */
async function lands(at: string): Promise<string> {
  const router = getRouter(createMemoryHistory({ initialEntries: [at] }));
  await router.load();
  return router.state.location.pathname;
}

beforeEach(() => loadSettings());

describe('the setup flow', () => {
  it('holds an unfinished setup at the step it asks for, and sends an app page to the start', async () => {
    expect(await lands('/welcome')).toBe('/welcome');
    expect(await lands('/spaces')).toBe('/welcome');
  });

  it('opens Help before setup ends', async () => {
    expect(await lands('/help')).toBe('/help');
  });

  it('sends a finished setup on to the app', async () => {
    await saveSetup({ ...DEFAULT_DRAFT, name: 'Meera' });

    // Setup runs once. A returning user who opens the marketing page and
    // presses Get started lands in the app, not on the first step again.
    expect(await lands('/welcome')).toBe('/dashboard');
    expect(await lands('/spaces')).toBe('/spaces');
  });
});
