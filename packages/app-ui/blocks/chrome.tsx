import {
  createContext,
  useContext,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";

import type { MoodKey } from "@september/core/rules/moods";
import type { Tier } from "@september/core/rules/panel";

/**
 * The text field on the screen that takes words from outside it: a phrase
 * from the rail or a sheet, Clear, Escape, and the mood keys.
 */
export interface EditorHandle {
  draft: string;
  /** Clears the draft, as the Clear key does. A note document has no Clear. */
  clear?: () => void;
  /** Adds words to the field. */
  insert: (text: string) => void;
  /** Whether the field speaks, so the sound output belongs to it. */
  speaks: boolean;
  /** Sets the mood. Absent when the screen has no mood. */
  onMood?: (mood: MoodKey | null) => void;
}

type EditorRef = MutableRefObject<EditorHandle | null>;

const EditorContext = createContext<EditorRef | null>(null);

/** Holds the active editor for the screens inside a shell. */
export function EditorProvider({ children }: { children: ReactNode }) {
  const editor = useRef<EditorHandle | null>(null);
  return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>;
}

/** The editor on the screen now. A part outside a shell gets its own. */
export function useActiveEditor(): EditorRef {
  const own = useRef<EditorHandle | null>(null);
  return useContext(EditorContext) ?? own;
}

/** What `PanelShell` shares with the screens inside it. */
export interface PanelState {
  tier: Tier;
  /** Whether the sound output menu of the composer is open. */
  outputOpen: boolean;
  setOutputOpen: (open: boolean) => void;
}

export const PanelContext = createContext<PanelState | null>(null);

/** The panel state, or null outside the panel. */
export function usePanel(): PanelState | null {
  return useContext(PanelContext);
}

/**
 * Which frame draws around a screen. `"shell"` is the app shell with the
 * sidebar and the dock. In `"panel"`, `PanelShell` draws the header, and
 * `ScreenHeader` and `SpaceDock` draw nothing.
 */
export type Chrome = "shell" | "panel";

export function useChrome(): Chrome {
  return usePanel() ? "panel" : "shell";
}
