/**
 * The app shell data, in plain TypeScript so a test can read it without a
 * renderer. `shell.tsx` supplies the icon for each path.
 */

import { helpGuide } from "@september/core/rules/help";
import { spaceFromSlug, spaceSlug } from "@september/core/rules/spaces";

import { STEPS } from "./onboarding.ts";
import { SPACE_MODE_PATH } from "./panel-nav.ts";
import { CONNECTION_GUIDES, isConnectionId, SETTINGS_NAV } from "./settings-nav.ts";

/** The name macOS and every window title show for the app. */
export const APP_NAME = "September";

/** The screens the sidebar links to, in order. Setup ends at the first one. */
export const APP_NAV = [
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
}[];

export type AppPath = (typeof APP_NAV)[number]["path"];

export function navFor(path: AppPath): (typeof APP_NAV)[number] {
  return APP_NAV.find((item) => item.path === path)!;
}

/** The native title for a route after redirects have settled. */
export function windowTitle(pathname: string): string {
  const path = pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
  const step = STEPS.find((item) => item.path === path);
  const setting = SETTINGS_NAV.find((item) => item.path === path);
  const destination = APP_NAV.find((item) => item.path === path);
  const guideSlug = path.match(/^\/help\/([^/]+)$/)?.[1];
  const guide = guideSlug ? helpGuide(guideSlug) : undefined;
  const provider = path.match(/^\/settings\/connections\/([^/]+)$/)?.[1];
  const connection = provider
    ? CONNECTION_GUIDES[provider as keyof typeof CONNECTION_GUIDES]
    : undefined;

  let page: string | undefined =
    step?.label ??
    setting?.title ??
    connection?.name ??
    guide?.title ??
    destination?.title;

  if (/^\/spaces\/[^/]+\/talk$/.test(path)) page = "Talk";
  else if (/^\/spaces\/[^/]+\/agent$/.test(path)) page = "Agent";
  else if (/^\/spaces\/[^/]+\/notes(?:\/[^/]+)?$/.test(path)) page = "Notes";
  else if (path === "/voice/clone") page = "Clone your voice";
  else if (path === "/eyetracker") page = "Eye tracker";

  return page ? `${APP_NAME} — ${page}` : APP_NAME;
}

const HELP_GUIDE_PATH = /^\/help\/([^/]+)$/;
const CONNECTION_PATH = /^\/settings\/connections\/([^/]+)$/;

/** True for a page of `APP_NAV`, a settings section, a connection page, or a
 *  Help guide. */
function isAppPage(path: string): boolean {
  if (path === "/voice/clone") return true;
  if (APP_NAV.some((item) => item.path === path)) return true;
  if (SETTINGS_NAV.some((item) => item.path === path)) return true;
  const provider = path.match(CONNECTION_PATH)?.[1];
  if (provider) return isConnectionId(provider);
  const guide = path.match(HELP_GUIDE_PATH)?.[1];
  return !!guide && !!helpGuide(guide);
}

/**
 * Where the app opens at launch.
 *
 * It is the saved path when that path is a space-mode path of a space that
 * exists, or a page of the app. Else it is Talk of the space that changed
 * last. With no spaces, it is the Spaces list. A setup step and an address
 * that names no screen never decide where the app opens.
 */
export function openingPath(
  saved: string | null | undefined,
  spaces: readonly { title?: string | null; updated_at: number }[],
): string {
  if (saved) {
    const slug = saved.match(SPACE_MODE_PATH)?.[1];
    if (slug && spaceFromSlug(slug, spaces)) return saved;
    if (isAppPage(saved)) return saved;
  }

  const recent = spaces.reduce<(typeof spaces)[number] | undefined>(
    (best, space) => (!best || space.updated_at > best.updated_at ? space : best),
    undefined,
  );
  return recent ? `/spaces/${spaceSlug(recent.title)}/talk` : APP_NAV[0].path;
}

/**
 * The base design viewport: a 13-inch iPad Pro in landscape, 1376px wide. The
 * Tauri window opens at this width, so the sidebar starts as an icon rail.
 * A wider screen opens the full sidebar.
 */
export const BASE_VIEWPORT_WIDTH = 1376;

export const isCompactWidth = (width: number) => width <= BASE_VIEWPORT_WIDTH;
