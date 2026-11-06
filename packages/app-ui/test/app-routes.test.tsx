import { describe, expect, it } from 'vitest';

import { AppShell } from '@september/app-ui/layouts/app';
import { createAppRoutes } from '@september/app-ui/routes';

const home = { component: () => <p>Home</p> };
const Page = () => <h1>Page</h1>;

describe('the route tree', () => {
  it('takes the pages that the capabilities of the platform offer', () => {
    expect(() => createAppRoutes({ shell: AppShell, home, pages: { '/dashboard': Page } })).not.toThrow();
  });

  it('refuses a platform page that the app does not give', () => {
    expect(() => createAppRoutes({ shell: AppShell, home })).toThrow(/dashboard/);
  });

  it('refuses a page that the capabilities of the platform do not offer', () => {
    expect(() =>
      createAppRoutes({
        shell: AppShell,
        home,
        pages: { '/dashboard': Page },
        sections: { '/settings/panel': Page },
      }),
    ).toThrow(/settings\/panel/);
  });
});
