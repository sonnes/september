import { expect, it, vi } from 'vitest';

import { finishSetup, renderApp } from './render';

it('names the link back to Settings by the words it shows', async () => {
  await finishSetup();
  const { container } = await renderApp('/settings/connections/openrouter');

  const back = await vi.waitFor(() => {
    const link = [...container.querySelectorAll('a')].find(one => one.textContent?.trim() === 'All settings');
    if (!link) throw new Error('No link back to Settings');
    return link;
  });
  expect(back.getAttribute('href')).toBe('/settings');
  expect(back.hasAttribute('aria-label')).toBe(false);
});
