/**
 * The rules of the right rail of a space, in plain TypeScript so a test can
 * read them without a renderer.
 *
 * The rail is a list of tabs, and one setting holds the tab the user left and
 * whether the card beside the rail was open.
 */

import { MOODS, type MoodKey } from "./moods.ts";

export const PANEL_TABS = [
  { key: "phrases", title: "Phrases" },
  { key: "voice", title: "Voice" },
] as const satisfies readonly { key: string; title: string }[];

export type PanelTab = (typeof PANEL_TABS)[number]["key"];

export interface PanelState {
  /** Whether the card beside the rail is open. */
  open: boolean;
  /** The tab the card shows. It is kept while closed, so it comes back. */
  tab: PanelTab;
}

export const CLOSED_PANEL: PanelState = { open: false, tab: "phrases" };

const isTab = (value: unknown): value is PanelTab =>
  PANEL_TABS.some((tab) => tab.key === value);

/**
 * The panel as the setting left it.
 *
 * The setting held `true` or `false` while Phrases was the only tab, so an
 * answer from that time still opens the phrases.
 */
export function panelStateFrom(saved: unknown): PanelState {
  if (typeof saved === "boolean") return { open: saved, tab: "phrases" };
  if (!saved || typeof saved !== "object") return CLOSED_PANEL;

  const { open, tab } = saved as { open?: unknown; tab?: unknown };
  return { open: open === true, tab: isTab(tab) ? tab : CLOSED_PANEL.tab };
}

/**
 * A press on a rail button.
 *
 * The tab that is open closes the card, and it stays the chosen tab. Any
 * other tab moves the card to it, whether the card was open or closed.
 */
export function pressTab(state: PanelState, tab: PanelTab): PanelState {
  return { open: !(state.open && state.tab === tab), tab };
}

/** What Escape does in the panel, in order of what it finds first. */
export function escapeStep({
  speaking,
  sheetOpen,
  draft,
}: {
  speaking: boolean;
  sheetOpen: boolean;
  draft: string;
}): "stop" | "close" | "hide" | "none" {
  if (speaking) return "stop";
  if (sheetOpen) return "close";
  return draft.trim() === "" ? "hide" : "none";
}

/**
 * The mood that Control and a digit set.
 *
 * The key is the digit of the key event. 1 to 5 give the five moods in their
 * order, 0 gives `null` to clear the mood, and any other key gives `undefined`.
 */
export function moodForKey(key: string): MoodKey | null | undefined {
  if (key === "0") return null;
  const index = /^[1-9]$/.test(key) ? Number(key) - 1 : -1;
  return MOODS[index]?.key;
}
