'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatPanelTab = 'phrases';

/** `rail` = collapsed icon rail; `expanded` = the 320px tool card is open. */
export type ChatPanelState = 'rail' | 'expanded';

export interface ChatPanelValue {
  state: ChatPanelState;
  /** Always set — the tab the panel expands to (persists across collapse). */
  activeTab: ChatPanelTab;
  /** Open the panel on a tab. */
  expandTab: (tab: ChatPanelTab) => void;
  /** Collapse back to the rail, keeping the active tab. */
  collapse: () => void;
  /** Flip between rail and expanded. */
  toggle: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'september:chat-panel';
const TABS: ChatPanelTab[] = ['phrases'];
const DEFAULT_TAB: ChatPanelTab = 'phrases';

// ---------------------------------------------------------------------------
// Persistence — migrates the legacy `{ open, widthPct }` shape on load
// ---------------------------------------------------------------------------

function isTab(value: unknown): value is ChatPanelTab {
  return typeof value === 'string' && (TABS as string[]).includes(value);
}

export function loadPanelState(): { state: ChatPanelState; activeTab: ChatPanelTab } {
  const fallback = { state: 'rail' as const, activeTab: DEFAULT_TAB };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Retired tabs (voice/provider/speech/history/context) fall back to phrases.
    const activeTab = isTab(parsed.activeTab) ? parsed.activeTab : DEFAULT_TAB;
    if (parsed.state === 'rail' || parsed.state === 'expanded') {
      return { state: parsed.state, activeTab };
    }
    // Legacy shape: { open: boolean, widthPct: number }.
    if (typeof parsed.open === 'boolean') {
      return { state: parsed.open ? 'expanded' : 'rail', activeTab };
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function savePanelState(state: ChatPanelState, activeTab: ChatPanelTab): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, activeTab }));
  } catch {
    // private mode / quota — state still lives in memory
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ChatPanelContext = createContext<ChatPanelValue | null>(null);

export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const initial = loadPanelState();
  const [state, setState] = useState<ChatPanelState>(initial.state);
  const [activeTab, setActiveTab] = useState<ChatPanelTab>(initial.activeTab);

  useEffect(() => {
    savePanelState(state, activeTab);
  }, [state, activeTab]);

  const expandTab = useCallback((tab: ChatPanelTab) => {
    setActiveTab(tab);
    setState('expanded');
  }, []);

  const collapse = useCallback(() => setState('rail'), []);

  const toggle = useCallback(() => {
    setState(prev => (prev === 'expanded' ? 'rail' : 'expanded'));
  }, []);

  // ⌘/Ctrl-. toggles the panel (left sidebar keeps ⌘B).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggle]);

  const value: ChatPanelValue = { state, activeTab, expandTab, collapse, toggle };

  return <ChatPanelContext.Provider value={value}>{children}</ChatPanelContext.Provider>;
}

export function useChatPanel(): ChatPanelValue {
  const ctx = useContext(ChatPanelContext);
  if (!ctx) {
    throw new Error('useChatPanel must be used within a ChatPanelProvider');
  }
  return ctx;
}
