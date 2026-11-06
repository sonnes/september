import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PresentOverlay } from '@september/app-ui/blocks/present';
import { PanelShell } from '@september/app-ui/layouts/panel';

import { axeViolations } from './axe';
import { addSpace, finishSetup, renderApp, renderPart } from './render';

function Panel() {
  return <PanelShell onHide={() => {}} />;
}

/** The container, once its screen shows a heading. */
async function settled(path: string, shell?: typeof Panel) {
  const { container } = await renderApp(path, shell ? { shell } : undefined);
  await vi.waitFor(() => expect(container.querySelector('h1, h2')).not.toBeNull());
  return container;
}

describe('setup', () => {
  it.each(['/welcome', '/choose'])('passes the axe rules that jsdom can run at %s', async path => {
    expect(await axeViolations(await settled(path))).toEqual([]);
  });
});

describe('the app', () => {
  beforeEach(async () => {
    await finishSetup();
    addSpace('Family', { context: 'Home' });
  });

  it.each([
    '/spaces',
    '/spaces/family/talk',
    '/spaces/family/notes',
    '/spaces/family/agent',
    '/voice',
    '/help',
    '/settings/access',
  ])('passes the axe rules that jsdom can run at %s', async path => {
    expect(await axeViolations(await settled(path))).toEqual([]);
  });

  it('passes the axe rules that jsdom can run in the panel', async () => {
    expect(await axeViolations(await settled('/spaces/family/talk', Panel))).toEqual([]);
  });
});

it('passes the axe rules that jsdom can run in the present overlay', async () => {
  await renderPart(<PresentOverlay name="Maya" content={'# Maya\n\nWe met in June.'} onClose={() => {}} />);
  expect(await axeViolations(document.querySelector('[role="dialog"]')!)).toEqual([]);
});
