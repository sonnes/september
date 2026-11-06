/**
 * The pages of the app, the sections of Settings, and where the app opens.
 *
 * Both apps draw one list. A page that only one platform offers names the
 * capability it needs, and `appNav` and `settingsNav` keep the pages that the
 * platform has.
 */

import { helpGuide } from "./help/search.ts";
import { SERVICE_NAMES } from "./services.ts";
import { SPACE_MODES, type SpaceMode } from "./records.ts";
import { spaceFromSlug, spaceSlug } from "./spaces.ts";

/** What a platform offers beyond the pages that every platform has. */
export interface Capabilities {
  /** A Today page that sums up the day. */
  dashboard: boolean;
  /** A camera eye tracker with its own test page. */
  eyeTracker: boolean;
  /** A panel window that can float above other apps. */
  floatingPanel: boolean;
}

type Capability = keyof Capabilities;

export const APP_PAGES = [
  {
    path: "/dashboard",
    title: "Today",
    description: "What happened today, and what to do next.",
    requires: "dashboard",
  },
  {
    path: "/spaces",
    title: "Spaces",
    description: "One space for each person or place you talk in.",
  },
  {
    path: "/voice",
    title: "Voice",
    description: "Who speaks, which voice, and one you make yourself.",
  },
  {
    path: "/eyetracker",
    title: "Eye tracker",
    description: "Test eye tracking inside the camera box.",
    requires: "eyeTracker",
  },
  {
    path: "/help",
    title: "Help",
    description: "How September works, and who to ask.",
  },
  {
    path: "/settings",
    title: "Settings",
    description: "How September runs, and the services it uses.",
  },
] as const satisfies readonly {
  path: string;
  title: string;
  description: string;
  requires?: Capability;
}[];

export type AppPage = (typeof APP_PAGES)[number];
export type AppPath = AppPage["path"];

const offered = (capabilities: Capabilities) => (page: object) =>
  !("requires" in page) || capabilities[page.requires as Capability];

/** The pages of the sidebar, in order. Setup ends at the first one. */
export function appNav(capabilities: Capabilities): readonly AppPage[] {
  return APP_PAGES.filter(offered(capabilities));
}

export function navFor(path: AppPath): AppPage {
  return APP_PAGES.find((page) => page.path === path)!;
}

export const SETTINGS_SECTIONS = [
  {
    path: "/settings",
    title: "Services",
    description: "The services September uses, and their keys.",
  },
  {
    path: "/settings/access",
    title: "Access",
    description: "How you choose things, the text size, and the theme.",
  },
  {
    path: "/settings/writing",
    title: "AI Assistance",
    description: "The provider, and the model for each feature.",
  },
  {
    path: "/settings/usage",
    title: "Usage",
    description: "Typing saved and service use on this device.",
  },
  {
    path: "/settings/panel",
    title: "Panel",
    description: "Keep the panel above other apps.",
    requires: "floatingPanel",
  },
  {
    path: "/settings/data",
    title: "Data",
    description: "Download a backup or restore one.",
  },
] as const satisfies readonly {
  path: string;
  title: string;
  description: string;
  requires?: Capability;
}[];

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];
export type SettingsPath = SettingsSection["path"];

export function settingsNav(capabilities: Capabilities): readonly SettingsSection[] {
  return SETTINGS_SECTIONS.filter(offered(capabilities));
}

/** The open section. A key page is a child of Services, so Services stays open. */
export function sectionFor(pathname: string): SettingsSection {
  return (
    SETTINGS_SECTIONS.find(
      (section) => section.path !== "/settings" && pathname.startsWith(section.path),
    ) ?? SETTINGS_SECTIONS[0]
  );
}

/** How to get a key, in the words of the user. */
export const CONNECTION_GUIDES = {
  openrouter: {
    name: SERVICE_NAMES.openrouter,
    lede: "One service that gives AI Assistance. Free models are available, and no card is necessary.",
    steps: [
      "Choose Connect OpenRouter below.",
      "Sign in and authorize September in your browser.",
      "Return to AI Assistance to choose the models.",
    ],
    url: "https://openrouter.ai/keys",
  },
  elevenlabs: {
    name: SERVICE_NAMES.elevenlabs,
    lede: "Natural voices, and a clone of your own voice. In September it speaks your messages.",
    steps: [
      "Open the ElevenLabs keys page and sign in.",
      'Press "Create API key" and copy it.',
      "Paste the key below.",
    ],
    url: "https://elevenlabs.io/app/settings/keys",
  },
} as const satisfies Record<
  string,
  { name: string; lede: string; steps: readonly string[]; url: string }
>;

export type ConnectionId = keyof typeof CONNECTION_GUIDES;

export const isConnectionId = (value: string): value is ConnectionId =>
  value in CONNECTION_GUIDES;

/** The title of each mode of a space. */
export const SPACE_MODE_TITLES: Record<SpaceMode, string> = {
  talk: "Talk",
  notes: "Notes",
  agent: "Agent",
};

const SPACE_PATH = /^\/spaces\/([^/]+)\/(?:(talk|agent|notes)|(notes)\/[^/]+)$/;
const HELP_GUIDE_PATH = /^\/help\/([^/]+)$/;
const CONNECTION_PATH = /^\/settings\/connections\/([^/]+)$/;
const CLONE_PATH = "/voice/clone";

/**
 * The space and the mode that a path names: Talk, Notes, a note, or Agent.
 * Any other path gives null.
 */
export function spaceRoute(path: string): { slug: string; mode: SpaceMode } | null {
  const found = SPACE_PATH.exec(path);
  if (!found) return null;
  return { slug: decodeURIComponent(found[1]), mode: (found[2] ?? found[3]) as SpaceMode };
}

/** The mode that ⌘⌥ and a digit open: 1 is the first mode, in the order of `SPACE_MODES`. */
export function modeForDigit(code: string): SpaceMode | undefined {
  const digit = /^Digit([1-9])$/.exec(code)?.[1];
  return digit ? SPACE_MODES[Number(digit) - 1] : undefined;
}

/** The paths that need a capability and that this platform offers. */
export function capabilityPaths(capabilities: Capabilities): string[] {
  return [...appNav(capabilities), ...settingsNav(capabilities)]
    .filter((page) => "requires" in page)
    .map((page) => page.path);
}

function isPage(path: string, capabilities: Capabilities): boolean {
  if (path === CLONE_PATH) return true;
  if (appNav(capabilities).some((page) => page.path === path)) return true;
  if (settingsNav(capabilities).some((section) => section.path === path)) return true;
  const provider = path.match(CONNECTION_PATH)?.[1];
  if (provider) return isConnectionId(provider);
  const guide = path.match(HELP_GUIDE_PATH)?.[1];
  return Boolean(guide && helpGuide(guide));
}

/**
 * Where the app opens at launch.
 *
 * The saved path wins when it names a space that exists or a page of the
 * app. Else the app opens Talk of the space that changed last, and with no
 * spaces it opens the first page. A setup step never decides.
 */
export function openingPath(
  saved: string | null,
  spaces: readonly { title?: string | null; updated_at: number }[],
  capabilities: Capabilities,
): string {
  if (saved) {
    const slug = spaceRoute(saved)?.slug;
    if (slug && spaceFromSlug(slug, spaces)) return saved;
    if (!slug && isPage(saved, capabilities)) return saved;
  }

  const recent = spaces.reduce<(typeof spaces)[number] | undefined>(
    (best, space) => (!best || space.updated_at > best.updated_at ? space : best),
    undefined,
  );
  return recent
    ? `/spaces/${spaceSlug(recent.title)}/talk`
    : appNav(capabilities)[0].path;
}
