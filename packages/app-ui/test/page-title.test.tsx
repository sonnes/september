import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { finishSetup, renderApp } from './render';

describe('the tab title', () => {
  it('names the screen that is open', async () => {
    await finishSetup();
    await renderApp('/voice');

    await vi.waitFor(() => expect(document.title).toBe('Voice · September'));
  });

  it('follows the screen the person moves to', async () => {
    await finishSetup();
    const { router } = await renderApp('/voice');
    await vi.waitFor(() => expect(document.title).toBe('Voice · September'));

    await act(async () => router!.navigate({ to: '/spaces' }));

    await vi.waitFor(() => expect(document.title).toBe('Spaces · September'));
  });
});
