import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { KeyPanel } from '@september/app-ui/blocks/services';
import { platform } from './test/platform';
it('connects OpenRouter through authorization and reports its status', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const status = { provider: 'openrouter' as const, connected: true, label: null, detail: null };
  const connected = vi.fn();
  const connect = vi.mocked(platform.providers.connectOpenRouter).mockResolvedValue(status);
  await act(async () => root.render(<KeyPanel provider="openrouter" name="OpenRouter" status={{ ...status, connected: false }} onConnected={connected} onForget={vi.fn()} />));
  expect(container.querySelector('input[type="password"]')).toBeNull();
  await act(async () => container.querySelector('button')!.click());
  expect(connect).toHaveBeenCalledWith(expect.any(AbortSignal));
  expect(connected).toHaveBeenCalledWith(status);
  act(() => root.unmount());
});
