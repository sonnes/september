/**
 * The app shell data, in plain TypeScript so a test can read it without a
 * renderer. `shell.tsx` supplies the icon for each path.
 */

/** The screens the sidebar links to, in order. Setup ends at the first one. */
export const APP_NAV = [
  {
    path: "/dashboard",
    title: "Dashboard",
    description: "What happened today, and what to do next.",
  },
  {
    path: "/spaces",
    title: "Spaces",
    description: "One space for each person or place you talk in.",
  },
  {
    path: "/voice",
    title: "Voice",
    description: "The voice that speaks your messages.",
  },
  {
    path: "/help",
    title: "Help",
    description: "How September works, and who to ask.",
  },
  {
    path: "/settings",
    title: "Settings",
    description: "Your name, your services, and your keys.",
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

/**
 * The base design viewport: a 13-inch iPad Pro in landscape, 1376px wide. The
 * Tauri window opens at this width, so the sidebar starts as an icon rail.
 * A wider screen opens the full sidebar.
 */
export const BASE_VIEWPORT_WIDTH = 1376;

export const isCompactWidth = (width: number) => width <= BASE_VIEWPORT_WIDTH;
