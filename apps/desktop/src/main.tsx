import { createRoot } from "react-dom/client";

import { createHashHistory, createRouter, redirect } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { App, createQueryClient } from "@september/app-ui/app";
import { PanelShell } from "@september/app-ui/layouts/panel";
import { createAppRoutes } from "@september/app-ui/routes";
import { spacesQuery } from "@september/app-ui/services/data";
import {
  currentSetup,
  loadSettings,
  subscribeSetup,
} from "@september/app-ui/services/settings";
import { openingPath } from "@september/core/rules/navigation";
import { isSetupDone } from "@september/core/rules/onboarding";

import { EyeTracker } from "./eye-tracker";
import { PanelSettings } from "./panel-settings";
import { platform } from "./platform";
import {
  hidePanel,
  panelSetup,
  readLastPath,
  saveLastPath,
  showPanel,
} from "./window";
import "./styles.css";

/** A window call that fails leaves the app usable, so it goes to the console. */
const report = (what: string) => (reason: unknown) =>
  console.error(`September could not ${what}.`, reason);

const queryClient = createQueryClient();

let lastPath: string | null = null;

const routeTree = createAppRoutes({
  shell: function Panel() {
    return <PanelShell onHide={() => void hidePanel().catch(report("hide the panel"))} />;
  },
  // The app opens where the user left it, or on Talk of the space that changed last.
  home: {
    beforeLoad: async () => {
      if (!isSetupDone(currentSetup())) throw redirect({ to: "/welcome" });
      const spaces = await queryClient
        .fetchQuery(spacesQuery())
        .catch((reason: unknown) => {
          report("read the spaces")(reason);
          return [];
        });
      throw redirect({ to: openingPath(lastPath, spaces, platform.capabilities) });
    },
  },
  pages: { "/eyetracker": EyeTracker },
  sections: { "/settings/panel": PanelSettings },
});

// Hash history keeps deep routes working from the Tauri asset protocol.
const router = createRouter({ routeTree, history: createHashHistory() });

// `onResolved` runs after redirects settle, so only the screen the user lands on is kept.
router.subscribe("onResolved", ({ toLocation }) => {
  const path = toLocation.pathname;
  if (path !== lastPath) {
    lastPath = path;
    saveLastPath(path).catch(report("keep the screen"));
  }
});

// Each screen sets the document title, and the Mac window shows the same words.
new MutationObserver(() => {
  getCurrentWindow().setTitle(document.title).catch(report("set the window title"));
}).observe(document.head, { childList: true, subtree: true, characterData: true });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

/** Setup runs in a normal window with a Dock icon. After it, the panel takes the saved float choice. */
function followSetup(): void {
  let done = isSetupDone(currentSetup());
  subscribeSetup(() => {
    const now = isSetupDone(currentSetup());
    if (now !== done) panelSetup(!now).catch(report("change the window"));
    done = now;
  });
}

/** Reads the settings once, mounts the app, then shows the panel. */
async function start(element: HTMLElement): Promise<void> {
  [lastPath] = await Promise.all([readLastPath(), loadSettings()]);
  followSetup();
  createRoot(element).render(<App router={router} queryClient={queryClient} />);
  if (!isSetupDone(currentSetup())) await panelSetup(true);
  await showPanel();
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element");
start(root).catch(report("start"));
