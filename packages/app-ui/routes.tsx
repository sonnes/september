import {
  createRootRoute,
  createRoute,
  redirect,
  type RouteComponent,
} from "@tanstack/react-router";

import { OnboardingLayout } from "@september/app-ui/layouts/onboarding";
import { SettingsLayout } from "@september/app-ui/layouts/settings";
import { APP_NAV } from "@september/app-ui/navigation";
import { platform } from "@platform/adapter";
import { AgentScreen } from "@september/app-ui/pages/agent";
import { HelpScreen } from "@september/app-ui/pages/help";
import { NotesScreen } from "@september/app-ui/pages/notes";
import { AccessSettings } from "@september/app-ui/pages/settings";
import { DataSettings } from "@september/app-ui/pages/settings-data";
import { ConnectionScreen, SetupSettings } from "@september/app-ui/pages/settings-services";
import { WritingSettings } from "@september/app-ui/pages/settings-writing";
import { SpacesScreen } from "@september/app-ui/pages/spaces";
import {
  ChooseStep,
  ConnectStep,
  FinishStep,
  ProfileStep,
  WelcomeStep,
} from "@september/app-ui/pages/steps";
import { TalkScreen } from "@september/app-ui/pages/talk";
import { UsageSettings } from "@september/app-ui/pages/usage";
import { VoiceCloneScreen, VoiceScreen } from "@september/app-ui/pages/voice";
import { currentSetup } from "@september/app-ui/services/settings";
import { helpGuide } from "@september/core/rules/help/search";
import {
  capabilityPaths,
  isConnectionId,
  type AppPath,
  type SettingsPath,
} from "@september/core/rules/navigation";
import { isSetupDone } from "@september/core/rules/onboarding";

export interface AppRoutes {
  /** The layout around Help and the app pages. */
  shell: RouteComponent;
  /** What `/` does on this platform: a page, or a redirect. */
  home: { component: RouteComponent } | { beforeLoad: () => Promise<never> };
  /** Pages outside the shell that need no setup. */
  publicPages?: Record<string, RouteComponent>;
  /** The pages that only this platform has, by their navigation path. */
  pages?: Partial<Record<AppPath, RouteComponent>>;
  /** The Settings sections that only this platform has. */
  sections?: Partial<Record<SettingsPath, RouteComponent>>;
}

/** Throws when the capabilities of the platform name other pages than the app gives. */
function checkPages(given: string[]): void {
  const offered = capabilityPaths(platform.capabilities).sort();
  const sorted = [...given].sort();
  if (offered.join() === sorted.join()) return;
  throw new Error(
    `The platform capabilities offer ${offered.join(", ") || "no extra pages"}, but the app gives ${sorted.join(", ") || "none"}.`,
  );
}

const finished = () => isSetupDone(currentSetup());

/**
 * The route tree of the app. Setup runs once: an unfinished setup sends an
 * app page to the first step, and a finished one sends a step to the first page.
 */
export function createAppRoutes({
  shell,
  home,
  publicPages = {},
  pages = {},
  sections = {},
}: AppRoutes) {
  checkPages([...Object.keys(pages), ...Object.keys(sections)]);
  const rootRoute = createRootRoute();

  const setupRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "setup",
    beforeLoad: () => {
      if (finished()) throw redirect({ to: APP_NAV[0].path });
    },
    component: OnboardingLayout,
  });

  const shellRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "shell",
    component: shell,
  });

  const appRoute = createRoute({
    getParentRoute: () => shellRoute,
    id: "app",
    beforeLoad: () => {
      if (!finished()) throw redirect({ to: "/welcome" });
    },
  });

  const settingsRoute = createRoute({
    getParentRoute: () => appRoute,
    path: "/settings",
    component: SettingsLayout,
  });

  const step = (path: string, component: RouteComponent) =>
    createRoute({ getParentRoute: () => setupRoute, path, component });

  const page = (path: string, component: RouteComponent) =>
    createRoute({ getParentRoute: () => appRoute, path, component });

  const section = (path: string, component: RouteComponent) =>
    createRoute({ getParentRoute: () => settingsRoute, path, component });

  const talkRoute = createRoute({
    getParentRoute: () => appRoute,
    path: "/spaces/$slug/talk",
    component: function Talk() {
      return <TalkScreen slug={talkRoute.useParams().slug} />;
    },
  });

  const agentRoute = createRoute({
    getParentRoute: () => appRoute,
    path: "/spaces/$slug/agent",
    component: function Agent() {
      return <AgentScreen slug={agentRoute.useParams().slug} />;
    },
  });

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

  const connectionRoute = createRoute({
    getParentRoute: () => settingsRoute,
    path: "/connections/$provider",
    beforeLoad: ({ params }) => {
      if (!isConnectionId(params.provider)) throw redirect({ to: "/settings" });
    },
    component: function Connection() {
      const { provider } = connectionRoute.useParams();
      return isConnectionId(provider) ? <ConnectionScreen provider={provider} /> : null;
    },
  });

  const helpGuideRoute = createRoute({
    getParentRoute: () => shellRoute,
    path: "/help/$guideSlug",
    beforeLoad: ({ params }) => {
      if (!helpGuide(params.guideSlug)) throw redirect({ to: "/help" });
    },
    component: function HelpGuide() {
      return <HelpScreen guideSlug={helpGuideRoute.useParams().guideSlug} />;
    },
  });

  return rootRoute.addChildren([
    createRoute({ getParentRoute: () => rootRoute, path: "/", ...home }),
    ...Object.entries(publicPages).map(([path, component]) =>
      createRoute({ getParentRoute: () => rootRoute, path, component }),
    ),
    setupRoute.addChildren([
      step("/welcome", WelcomeStep),
      step("/choose", ChooseStep),
      step("/profile", ProfileStep),
      step("/connect", ConnectStep),
      step("/finish", FinishStep),
    ]),
    shellRoute.addChildren([
      createRoute({ getParentRoute: () => shellRoute, path: "/help", component: HelpScreen }),
      helpGuideRoute,
      appRoute.addChildren([
        page("/spaces", SpacesScreen),
        talkRoute,
        agentRoute,
        notesRoute,
        noteRoute,
        page("/voice", VoiceScreen),
        page("/voice/clone", VoiceCloneScreen),
        ...Object.entries(pages).map(([path, component]) => page(path, component)),
        settingsRoute.addChildren([
          section("/", SetupSettings),
          section("/access", AccessSettings),
          section("/writing", WritingSettings),
          section("/usage", UsageSettings),
          section("/data", DataSettings),
          ...Object.entries(sections).map(([path, component]) =>
            section(path.slice("/settings".length), component),
          ),
          connectionRoute,
        ]),
      ]),
    ]),
  ]);
}
