// @vitest-environment jsdom
import 'fake-indexeddb/auto';

import { createMemoryHistory } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import { getRouter } from './router';
import { saveSetup } from './services/os';

/** Where the router settles when it is asked for a path. */
async function lands(at: string): Promise<string> {
  const router = getRouter(createMemoryHistory({ initialEntries: [at] }));
  await router.load();
  return router.state.location.pathname;
}

// The two tests share one database, so the unfinished setup is asked for first.
describe('the setup flow', () => {
  it('holds an unfinished setup at the step it asks for', async () => {
    expect(await lands('/welcome')).toBe('/welcome');
  });

  it('sends a finished setup on to the app', async () => {
    await saveSetup({
      name: 'Meera',
      speakingStyle: 'Plain, warm, and direct.',
      personalWords: '',
      mode: 'free',
      writingService: 'none',
      writingModel: '',
      voiceService: 'system',
    });

    // Setup runs once. A returning user who opens the marketing page and
    // presses Get started should land in the app, not answer it all again.
    expect(await lands('/welcome')).toBe('/dashboard');
  });
});
