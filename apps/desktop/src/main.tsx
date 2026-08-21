import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

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
import { type AppPath } from "./app-nav";
import { isSetupDone } from "./onboarding";
import { currentSetup } from "./os";
import { AppScreen, AppShell } from "./shell";
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

const routeTree = rootRoute.addChildren([
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    // Setup runs once. After that the app opens straight into the shell.
    beforeLoad: () => {
      throw redirect({
        to: isSetupDone(currentSetup()) ? "/dashboard" : "/welcome",
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
    screen("/spaces"),
    screen("/voice"),
    screen("/help"),
    screen("/settings"),
  ]),
]);

// ponytail: hash history keeps deep routes working from the Tauri asset
// protocol without a dev-server rewrite rule.
const router = createRouter({ routeTree, history: createHashHistory() });

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
    <RouterProvider router={router} />
  </StrictMode>,
);
