import { describe, expect, it, vi } from 'vitest';

import { PanelShell } from '@september/app-ui/layouts/panel';
import { SETTINGS_NAV } from '@september/app-ui/navigation';

import { platform } from './platform';
import { findButton, finishSetup, press, renderApp } from './render';

function Panel() {
  return <PanelShell onHide={() => {}} />;
}

async function renderPanel(path: string) {
  await finishSetup();
  return renderApp(path, { shell: Panel });
}

const sections = () =>
  vi.waitFor(() => {
    const nav = document.querySelector('main nav[aria-label="Settings sections"]');
    if (!nav) throw new Error('No settings sections');
    return nav;
  });

describe('a page in the panel', () => {
  it('keeps the title and the action of a screen', async () => {
    await renderPanel('/voice');

    await vi.waitFor(() => expect(document.querySelector('main h1')?.textContent).toBe('Voice'));
    await press(await findButton('Hear it', document.querySelector('main')!));
    await vi.waitFor(() => expect(platform.voice.speakSystem).toHaveBeenCalled());
  });

  it('keeps each settings section and the open section', async () => {
    await renderPanel('/settings');

    const links = [...(await sections()).querySelectorAll('a')].map(link => link.getAttribute('href'));
    expect(links).toEqual(SETTINGS_NAV.map(item => item.path));
    expect(document.querySelector('main')!.querySelectorAll('h1, h2').length).toBeGreaterThan(0);
  });

  it('marks the open section as the current page', async () => {
    await renderPanel('/settings/access');

    const current = [...(await sections()).querySelectorAll('a[aria-current="page"]')];
    expect(current.map(link => link.getAttribute('href'))).toEqual(['/settings/access']);
  });

  it('keeps the Help search', async () => {
    await renderPanel('/help');

    await vi.waitFor(() => expect(document.querySelector('main input[type="search"]')).not.toBeNull());
  });
});
