import { createRouter, type RouterHistory } from '@tanstack/react-router';

import { AppShell } from '@september/app-ui/layouts/app';
import { DashboardScreen } from '@september/app-ui/pages/dashboard';
import { createAppRoutes } from '@september/app-ui/routes';
import { HomePage } from '@/pages/home';
import { PrivacyPolicy, TermsOfService } from '@/pages/legal';
import { analyticsPath } from '@/rules/analytics';
import { countPage } from '@/services/analytics';

const routeTree = createAppRoutes({
  shell: AppShell,
  home: { component: HomePage },
  publicPages: { '/privacy-policy': PrivacyPolicy, '/terms-of-service': TermsOfService },
  pages: { '/dashboard': DashboardScreen },
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
