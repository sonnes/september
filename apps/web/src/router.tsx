import { createRouter, type RouterHistory } from '@tanstack/react-router';

import { AppShell } from '@september/app-ui/layouts/app';
import { DashboardScreen } from '@september/app-ui/pages/dashboard';
import { createAppRoutes } from '@september/app-ui/routes';
import { loadSettings } from '@september/app-ui/services/settings';
import { PUBLIC_PAGES } from '@/public-pages';
import { analyticsPath } from '@/rules/analytics';
import { countPage } from '@/services/analytics';

const { '/': landing, ...others } = PUBLIC_PAGES;

let reading: Promise<void> | null = null;

/**
 * Reads the settings once. A public page does not call it, so the landing
 * page, the legal pages, and Help never open the database.
 */
export function settingsReady(): Promise<void> {
  reading ??= loadSettings().catch(reason => {
    // The app still opens when this browser denies storage.
    console.error('September could not read its settings.', reason);
  });
  return reading;
}

const routeTree = createAppRoutes({
  shell: AppShell,
  home: { component: landing.component },
  publicPages: Object.fromEntries(
    Object.entries(others).flatMap(([path, page]) =>
      'component' in page ? [[path, page.component]] : []
    )
  ),
  pages: { '/dashboard': DashboardScreen },
  settingsReady,
});

export const getRouter = (history: RouterHistory) => createRouter({ routeTree, history });

export type WebRouter = ReturnType<typeof getRouter>;

/** Counts each page under the shape of its route, so an address that holds a name is not sent. */
export function countPages(router: WebRouter): () => void {
  return router.subscribe('onResolved', ({ toLocation }) => {
    const matched = router.state.matches[router.state.matches.length - 1];
    countPage(analyticsPath(matched?.fullPath, toLocation.pathname));
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: WebRouter;
  }
}
