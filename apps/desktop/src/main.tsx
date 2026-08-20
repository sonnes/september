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
import { FinishStep, ModeStep, ProfileStep, WelcomeStep } from "./steps";
import "./styles.css";

const rootRoute = createRootRoute({ component: OnboardingLayout });

const step = (path: string, component: () => React.JSX.Element) =>
  createRoute({ getParentRoute: () => rootRoute, path, component });

const routeTree = rootRoute.addChildren([
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    beforeLoad: () => {
      throw redirect({ to: "/welcome" });
    },
  }),
  step("/welcome", WelcomeStep),
  step("/profile", ProfileStep),
  step("/mode", ModeStep),
  step("/finish", FinishStep),
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
