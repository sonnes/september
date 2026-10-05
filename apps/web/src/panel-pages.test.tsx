// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChromeContext } from '@september/app-ui/blocks/chrome';
import { Screen } from '@september/app-ui/blocks/screen';
import { SettingsLayout } from '@september/app-ui/layouts/settings';
import { HelpScreen } from '@september/app-ui/pages/help';
import { SETTINGS_NAV } from '@platform/rules/settings-nav';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  Outlet: () => <p>The section</p>,
  useRouterState: ({ select }: { select: (value: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: '/settings' } }),
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** Renders a page inside the panel chrome, with no sidebar around it. */
function inPanel(page: React.ReactElement) {
  act(() => root.render(<ChromeContext.Provider value="panel">{page}</ChromeContext.Provider>));
}

describe('a page in the panel', () => {
  it('keeps the title and the action of a screen', () => {
    const onAction = vi.fn();
    inPanel(
      <Screen title="Voice" action={<button type="button" onClick={onAction}>Hear it</button>}>
        body
      </Screen>,
    );

    expect(container.querySelector('h1')?.textContent).toBe('Voice');
    const action = [...container.querySelectorAll('button')].find((one) => one.textContent === 'Hear it');
    act(() => action!.click());
    expect(onAction).toHaveBeenCalled();
  });

  it('keeps each settings section and the open section', () => {
    inPanel(<SettingsLayout />);

    const links = [...container.querySelectorAll('a')].map((link) => link.getAttribute('href'));
    expect(links).toEqual(SETTINGS_NAV.map((item) => item.path));
    expect(container.textContent).toContain('The section');
  });

  it('keeps the Help search', () => {
    Element.prototype.scrollIntoView = vi.fn();
    inPanel(<HelpScreen />);

    expect(container.querySelector('[data-help-search]')).not.toBeNull();
  });
});
