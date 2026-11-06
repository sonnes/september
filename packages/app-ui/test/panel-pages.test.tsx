import { describe, expect, it, vi } from 'vitest';

import { ChromeContext } from '@september/app-ui/blocks/chrome';
import { Screen } from '@september/app-ui/blocks/screen';
import { PanelShell } from '@september/app-ui/layouts/panel';
import { SETTINGS_NAV } from '@september/app-ui/navigation';

import { findButton, finishSetup, press, renderApp, renderPart } from './render';

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
    const onAction = vi.fn();
    const { container } = await renderPart(
      <ChromeContext.Provider value="panel">
        <Screen
          title="Voice"
          action={
            <button type="button" onClick={onAction}>
              Hear it
            </button>
          }
        >
          body
        </Screen>
      </ChromeContext.Provider>,
    );

    expect(container.querySelector('h1')?.textContent).toBe('Voice');
    await press(await findButton('Hear it', container));
    expect(onAction).toHaveBeenCalled();
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
