import { createMemoryHistory } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import { saveSetup } from '@september/app-ui/services/settings';
import { APP_NAV, SETTINGS_NAV } from '@september/app-ui/navigation';
import { DEFAULT_DRAFT, STEPS } from '@september/core/rules/onboarding';

import { OWN_PARAMETER_ROUTES } from './rules/analytics';
import { getRouter } from './router';

/** Where the router settles when it is asked for a path, or null when no route matches. */
async function lands(at: string): Promise<string | null> {
  const router = getRouter(createMemoryHistory({ initialEntries: [at] }));
  await router.load();
  const found = router.state.matches.at(-1)?.routeId !== '__root__';
  return found ? router.state.location.pathname : null;
}

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
    expect(await lands('/welcome')).toBe(APP_NAV[0].path);
    expect(await lands('/spaces')).toBe('/spaces');
  });
});

describe('the routes', () => {
  it('hold every route that analytics reports by its address', () => {
    const router = getRouter(createMemoryHistory());
    for (const pattern of OWN_PARAMETER_ROUTES) expect(router.routesByPath).toHaveProperty([pattern]);
  });

  it('open every step before setup ends', async () => {
    for (const step of STEPS) expect(await lands(step.path)).toBe(step.path);
  });

  it('open every page and section of the navigation after setup', async () => {
    await saveSetup({ ...DEFAULT_DRAFT, name: 'Meera' });

    for (const { path } of [...APP_NAV, ...SETTINGS_NAV]) expect(await lands(path)).toBe(path);
  });

  it('send an unknown service back to Settings', async () => {
    await saveSetup({ ...DEFAULT_DRAFT, name: 'Meera' });

    expect(await lands('/settings/connections/openrouter')).toBe('/settings/connections/openrouter');
    expect(await lands('/settings/connections/nobody')).toBe('/settings');
  });
});
