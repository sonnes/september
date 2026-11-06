import { createContext, useContext, type MutableRefObject } from "react";

import type { MoodKey } from "@september/core/rules/moods";
import type { Tier } from "@september/core/rules/panel";

/**
 * Which frame draws around a screen.
 *
 * `"shell"` is the app shell with the sidebar and the dock. `"panel"` is the
 * floating panel of the desktop app, where `PanelShell` draws the header and
 * `ScreenHeader` and `SpaceDock` draw nothing.
 */
export type Chrome = "shell" | "panel";

export const ChromeContext = createContext<Chrome>("shell");

export function useChrome(): Chrome {
  return useContext(ChromeContext);
}

/** What the composer on the screen lets the panel header do. */
export interface ComposerHandle {
  draft: string;
  /** Clears the draft, as the Clear key does. A note document has no Clear. */
  clear?: () => void;
  /** Adds words at the end of the draft. */
  insert: (text: string) => void;
  /** Whether the composer speaks, so the sound output belongs to it. */
  speaks: boolean;
  /** Sets the mood. Absent when the screen has no mood. */
  onMood?: (mood: MoodKey | null) => void;
}

/** What `PanelShell` shares with the screens inside it. */
export interface PanelState {
  tier: Tier;
  /** The composer that is on the screen now, or null. */
  composer: MutableRefObject<ComposerHandle | null>;
  /** Whether the sound output menu of the composer is open. */
  outputOpen: boolean;
  setOutputOpen: (open: boolean) => void;
}

export const PanelContext = createContext<PanelState | null>(null);

/** The panel state, or null outside the panel. */
export function usePanel(): PanelState | null {
  return useContext(PanelContext);
}
