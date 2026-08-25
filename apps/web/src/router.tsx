import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router';

import { AppShell } from '@september/app-ui/layouts/app';
import { OnboardingLayout } from '@september/app-ui/layouts/onboarding';
import { SettingsLayout } from '@september/app-ui/layouts/settings';
import { DashboardScreen } from '@september/app-ui/pages/dashboard';
import { HelpScreen } from '@september/app-ui/pages/help';
import { NotesScreen } from '@september/app-ui/pages/notes';
import { HomePage } from '@/pages/home';
import { ConnectionScreen, SetupSettings, WritingSettings } from '@september/app-ui/pages/settings';
import { NewSpaceScreen, SpacesScreen } from '@september/app-ui/pages/spaces';
import { ConnectStep, FinishStep, ModeStep, ProfileStep, WelcomeStep } from '@september/app-ui/pages/steps';
import { TalkScreen } from '@september/app-ui/pages/talk';
import { UsageSettings } from '@september/app-ui/pages/usage';
import { VoiceCloneScreen, VoiceScreen } from '@september/app-ui/pages/voice';
import { helpGuide } from '@september/core/rules/help';
import { isSetupDone } from '@/rules/onboarding';
import { isConnectionId } from '@/rules/settings-nav';
import {
  bootstrapBrowserServices,
  currentSetup,
  savePath,
} from '@/services/os';

export const APP_ROUTE_PATHS = [
  '/',
  '/welcome',
  '/profile',
  '/mode',
  '/connect',
  '/finish',
  '/dashboard',
  '/spaces',
  '/spaces/new',
  '/spaces/$slug/talk',
  '/spaces/$slug/notes',
  '/spaces/$slug/notes/$noteSlug',
  '/voice',
  '/voice/clone',
  '/help',
  '/help/$guideSlug',
  '/settings',
  '/settings/writing',
  '/settings/usage',
  '/settings/connections/$provider',
] as const;

export const ROOT_ROUTE_BEHAVIOR = 'landing' as const;

const rootRoute = createRootRoute();

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'setup',
  // Setup runs once. A user who has finished it and asks for a step — from
  // the landing page, a bookmark, or the back button — goes to the app
  // instead. The mirror of the guard the app routes keep.
  beforeLoad: async () => {
    await bootstrapBrowserServices();
    if (isSetupDone(currentSetup())) throw redirect({ to: '/dashboard' });
  },
  component: OnboardingLayout,
});

const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  component: AppShell,
});

const appRoute = createRoute({
  getParentRoute: () => shellRoute,
  id: 'app',
  beforeLoad: async () => {
    await bootstrapBrowserServices();
    if (!isSetupDone(currentSetup())) throw redirect({ to: '/welcome' });
  },
});

const step = (path: string, component: () => React.JSX.Element) =>
  createRoute({ getParentRoute: () => setupRoute, path, component });

const talkRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/spaces/$slug/talk',
  component: function Talk() {
    return <TalkScreen slug={talkRoute.useParams().slug} />;
  },
});

const notesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/spaces/$slug/notes',
  component: function Notes() {
    return <NotesScreen slug={notesRoute.useParams().slug} />;
  },
});

const noteRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/spaces/$slug/notes/$noteSlug',
  component: function Note() {
    const { slug, noteSlug } = noteRoute.useParams();
    return <NotesScreen slug={slug} noteSlug={noteSlug} />;
  },
});

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settings',
  component: SettingsLayout,
});

const connectionRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/connections/$provider',
  beforeLoad: ({ params }) => {
    if (!isConnectionId(params.provider)) throw redirect({ to: '/settings' });
  },
  component: function Connection() {
    return (
      <ConnectionScreen
        provider={connectionRoute.useParams().provider as 'openrouter' | 'elevenlabs'}
      />
    );
  },
});

const helpHomeRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/help',
  component: HelpScreen,
});

const helpGuideRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/help/$guideSlug',
  beforeLoad: ({ params }) => {
    if (!helpGuide(params.guideSlug)) throw redirect({ to: '/help' });
  },
  component: function HelpGuide() {
    return <HelpScreen guideSlug={helpGuideRoute.useParams().guideSlug} />;
  },
});

const guardedAppRoute = appRoute.addChildren([
  createRoute({
    getParentRoute: () => appRoute,
    path: '/dashboard',
    component: DashboardScreen,
  }),
  createRoute({
    getParentRoute: () => appRoute,
    path: '/spaces',
    component: SpacesScreen,
  }),
  createRoute({
    getParentRoute: () => appRoute,
    path: '/spaces/new',
    component: NewSpaceScreen,
  }),
  talkRoute,
  notesRoute,
  noteRoute,
  createRoute({
    getParentRoute: () => appRoute,
    path: '/voice',
    component: VoiceScreen,
  }),
  createRoute({
    getParentRoute: () => appRoute,
    path: '/voice/clone',
    component: VoiceCloneScreen,
  }),
  settingsRoute.addChildren([
    createRoute({
      getParentRoute: () => settingsRoute,
      path: '/',
      component: SetupSettings,
    }),
    createRoute({
      getParentRoute: () => settingsRoute,
      path: '/writing',
      component: WritingSettings,
    }),
    createRoute({
      getParentRoute: () => settingsRoute,
      path: '/usage',
      component: UsageSettings,
    }),
    connectionRoute,
  ]),
]);

const routeTree = rootRoute.addChildren([
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: HomePage,
  }),
  setupRoute.addChildren([
    step('/welcome', WelcomeStep),
    step('/profile', ProfileStep),
    step('/mode', ModeStep),
    step('/connect', ConnectStep),
    step('/finish', FinishStep),
  ]),
  shellRoute.addChildren([helpHomeRoute, helpGuideRoute, guardedAppRoute]),
]);

/**
 * The router.
 *
 * The prerender passes a memory history, because a build machine has no
 * browser. Only the browser router remembers where the user was, since the
 * path is saved in IndexedDB and a prerender has none.
 */
export function getRouter(history?: RouterHistory) {
  const router = createRouter({ routeTree, history: history ?? createBrowserHistory() });
  if (!history) {
    router.subscribe('onResolved', ({ toLocation }) => {
      void savePath(toLocation.pathname);
    });
  }
  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
