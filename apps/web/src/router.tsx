import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';

import { AppScreen } from '@september/app-ui/blocks/screen';
import { AppShell } from '@september/app-ui/layouts/app';
import { OnboardingLayout } from '@september/app-ui/layouts/onboarding';
import { SettingsLayout } from '@september/app-ui/layouts/settings';
import { DashboardScreen } from '@september/app-ui/pages/dashboard';
import { NotesScreen } from '@september/app-ui/pages/notes';
import { HomePage } from '@/pages/home';
import { ConnectionScreen, SetupSettings, WritingSettings } from '@september/app-ui/pages/settings';
import { NewSpaceScreen, SpacesScreen } from '@september/app-ui/pages/spaces';
import { ConnectStep, FinishStep, ModeStep, ProfileStep, WelcomeStep } from '@september/app-ui/pages/steps';
import { TalkScreen } from '@september/app-ui/pages/talk';
import { UsageSettings } from '@september/app-ui/pages/usage';
import { VoiceCloneScreen, VoiceScreen } from '@september/app-ui/pages/voice';
import { type AppPath } from '@/rules/app-nav';
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
  beforeLoad: bootstrapBrowserServices,
  component: OnboardingLayout,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: async () => {
    await bootstrapBrowserServices();
    if (!isSetupDone(currentSetup())) throw redirect({ to: '/welcome' });
  },
  component: AppShell,
});

const step = (path: string, component: () => React.JSX.Element) =>
  createRoute({ getParentRoute: () => setupRoute, path, component });

const screen = (path: AppPath) =>
  createRoute({
    getParentRoute: () => appRoute,
    path,
    component: () => <AppScreen path={path} />,
  });

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
  appRoute.addChildren([
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
    screen('/help'),
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
  ]),
]);

export function getRouter() {
  const router = createRouter({ routeTree, history: createBrowserHistory() });
  router.subscribe('onResolved', ({ toLocation }) => {
    void savePath(toLocation.pathname);
  });
  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
