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

export type ChatPanelTab = 'history' | 'voice' | 'boards';

export interface ChatPanelState {
  open: boolean;
  /** null = the overview card grid; a tab = that section's content. */
  activeTab: ChatPanelTab | null;
  widthPct: number;
}

export interface ChatPanelActions {
  openTab: (tab: ChatPanelTab) => void;
  /** Open the panel on the overview card grid. */
  openOverview: () => void;
  /** Return to the overview without closing the panel. */
  home: () => void;
  close: () => void;
  toggle: () => void;
  setWidthPct: (n: number) => void;
}

export type UseChatPanelReturn = ChatPanelState & ChatPanelActions;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'september:chat-panel';
const DEFAULT_WIDTH_PCT = 38;
const MIN_WIDTH_PCT = 20;
const MAX_WIDTH_PCT = 70;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampWidth(n: number): number {
  if (n < MIN_WIDTH_PCT) return MIN_WIDTH_PCT;
  if (n > MAX_WIDTH_PCT) return MAX_WIDTH_PCT;
  return n;
}

interface PersistedShape {
  open?: unknown;
  widthPct?: unknown;
}

function loadFromStorage(): { open: boolean; widthPct: number } {
  const fallback = { open: false, widthPct: DEFAULT_WIDTH_PCT };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as PersistedShape;
    const open = typeof parsed.open === 'boolean' ? parsed.open : false;
    const widthPct =
      typeof parsed.widthPct === 'number' && Number.isFinite(parsed.widthPct)
        ? clampWidth(parsed.widthPct)
        : DEFAULT_WIDTH_PCT;
    return { open, widthPct };
  } catch {
    return fallback;
  }
}

function saveToStorage(open: boolean, widthPct: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ open, widthPct }));
  } catch {
    // private mode / quota — state still lives in memory
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ChatPanelContext = createContext<UseChatPanelReturn | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const persisted = loadFromStorage();

  const [open, setOpen] = useState(persisted.open);
  const [activeTab, setActiveTab] = useState<ChatPanelTab | null>(null);
  const [widthPct, setWidthPctState] = useState(persisted.widthPct);

  // Persist open + widthPct whenever they change.
  useEffect(() => {
    saveToStorage(open, widthPct);
  }, [open, widthPct]);

  const openTab = useCallback((tab: ChatPanelTab) => {
    setActiveTab(tab);
    setOpen(true);
  }, []);

  const openOverview = useCallback(() => {
    setActiveTab(null);
    setOpen(true);
  }, []);

  const home = useCallback(() => {
    setActiveTab(null);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  const setWidthPct = useCallback((n: number) => {
    if (!Number.isFinite(n)) return;
    setWidthPctState(clampWidth(Math.round(n)));
  }, []);

  const value: UseChatPanelReturn = {
    open,
    activeTab,
    widthPct,
    openTab,
    openOverview,
    home,
    close,
    toggle,
    setWidthPct,
  };

  return (
    <ChatPanelContext.Provider value={value}>
      {children}
    </ChatPanelContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChatPanel(): UseChatPanelReturn {
  const ctx = useContext(ChatPanelContext);
  if (!ctx) {
    throw new Error('useChatPanel must be used within a ChatPanelProvider');
  }
  return ctx;
}
