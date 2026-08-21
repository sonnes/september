import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  RouterProvider,
} from "@tanstack/react-router";

import "@fontsource/lexend/700.css";
import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/500.css";
import "@fontsource/noto-sans/600.css";
import "@fontsource/noto-sans/700.css";

import { OnboardingLayout } from "./app";
import { openingPath, type AppPath } from "./app-nav";
import { NotesScreen } from "./notes-screen";
import { isSetupDone } from "./onboarding";
import { currentPath, currentSetup, savePath } from "./os";
import {
  ConnectionScreen,
  SettingsLayout,
  SetupSettings,
  WritingSettings,
} from "./settings";
import { isConnectionId } from "./settings-nav";
import { AppScreen, AppShell } from "./shell";
import { SpacesScreen, TalkScreen } from "./talk";
import { VoiceScreen } from "./voice";
import {
  ConnectStep,
  FinishStep,
  ModeStep,
  ProfileStep,
  WelcomeStep,
} from "./steps";
import "./styles.css";

// The root route holds an outlet only. Setup and the app are separate
// layouts below it, so a step never wears the app sidebar.
const rootRoute = createRootRoute();

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "setup",
  component: OnboardingLayout,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  // Every app screen needs a name and a mode, so an unfinished setup turns
  // back to the start. A reload of a deep route passes through here too.
  beforeLoad: () => {
    if (!isSetupDone(currentSetup())) throw redirect({ to: "/welcome" });
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

const spacesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/spaces",
  component: SpacesScreen,
});

// The slug names the space, so no identifier is in the address. The `/talk`
// segment keeps room for a second mode inside a space.
const talkRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/spaces/$slug/talk",
  component: function Talk() {
    return <TalkScreen slug={talkRoute.useParams().slug} />;
  },
});

// A note is named by its slug too. Without one in the address, the note the
// user changed last opens.
const notesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/spaces/$slug/notes",
  component: function Notes() {
    return <NotesScreen slug={notesRoute.useParams().slug} />;
  },
});

const noteRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/spaces/$slug/notes/$noteSlug",
  component: function Note() {
    const { slug, noteSlug } = noteRoute.useParams();
    return <NotesScreen slug={slug} noteSlug={noteSlug} />;
  },
});

// Settings is a layout with a section list, so a section keeps the list
// beside it. A connection page is a child of Setup, not a section of its own.
const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/settings",
  component: SettingsLayout,
});

const connectionRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "/connections/$provider",
  beforeLoad: ({ params }) => {
    if (!isConnectionId(params.provider)) throw redirect({ to: "/settings" });
  },
  component: function Connection() {
    const { provider } = connectionRoute.useParams();
    return <ConnectionScreen provider={provider as "openrouter" | "elevenlabs"} />;
  },
});

const routeTree = rootRoute.addChildren([
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    // Setup runs once. After that the app opens where the user left it.
    beforeLoad: () => {
      throw redirect({
        to: isSetupDone(currentSetup()) ? openingPath(currentPath()) : "/welcome",
      });
    },
  }),
  setupRoute.addChildren([
    step("/welcome", WelcomeStep),
    step("/profile", ProfileStep),
    step("/mode", ModeStep),
    step("/connect", ConnectStep),
    step("/finish", FinishStep),
  ]),
  appRoute.addChildren([
    screen("/dashboard"),
    spacesRoute,
    talkRoute,
    notesRoute,
    noteRoute,
    createRoute({
      getParentRoute: () => appRoute,
      path: "/voice",
      component: VoiceScreen,
    }),
    screen("/help"),
    settingsRoute.addChildren([
      createRoute({
        getParentRoute: () => settingsRoute,
        path: "/",
        component: SetupSettings,
      }),
      createRoute({
        getParentRoute: () => settingsRoute,
        path: "/writing",
        component: WritingSettings,
      }),
      connectionRoute,
    ]),
  ]),
]);

// ponytail: hash history keeps deep routes working from the Tauri asset
// protocol without a dev-server rewrite rule.
const router = createRouter({ routeTree, history: createHashHistory() });

// The app opens where the user left it, so every arrival is kept. `onResolved`
// runs after the route settles, so a redirect keeps only where it landed.
router.subscribe("onResolved", ({ toLocation }) => {
  void savePath(toLocation.pathname);
});

// One client for the app. SQLite is next to the app, so a read is cheap and
// a stale row is not worth a background refetch.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing root element");
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
