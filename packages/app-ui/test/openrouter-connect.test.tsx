import { expect, it, vi } from 'vitest';

import { KeyPanel } from '@september/app-ui/blocks/services';

import { platform } from './platform';
import { findButton, press, renderPart } from './render';

it('connects OpenRouter through authorization and shows it connected', async () => {
  const status = { provider: 'openrouter' as const, connected: true, label: null, detail: 'Signed in' };
  vi.mocked(platform.providers.connectOpenRouter).mockResolvedValue(status);
  const { container } = await renderPart(<KeyPanel provider="openrouter" />);

  expect(container.querySelector('input[type="password"]')).toBeNull();
  await press(await findButton('Connect OpenRouter', container));

  expect(platform.providers.connectOpenRouter).toHaveBeenCalledWith(expect.any(AbortSignal));
  await findButton('Disconnect', container);
  expect(container.textContent).toContain('Signed in');
});
