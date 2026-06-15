'use client';

import { createContext, PropsWithChildren, useContext, useState } from 'react';
import { createPortal } from 'react-dom';

import { SidebarInset, SidebarProvider } from '@/packages/ui/components/sidebar';

import { User, useIsCompact } from '@/packages/shared';

import { AppSidebar } from './app-sidebar';

const RightPanelSlotContext = createContext<HTMLElement | null>(null);

export default function SidebarLayout({ children }: PropsWithChildren) {
  // iPad 13" is the base viewport: at or below it the sidebar defaults to an
  // icon rail, wider screens to the full sidebar. Keying the provider on the
  // breakpoint re-applies the viewport default when it flips; a manual toggle
  // (rail or ⌘/Ctrl-B) wins until then.
  const isCompact = useIsCompact();
  const [rightPanelSlot, setRightPanelSlot] = useState<HTMLElement | null>(null);

  return (
    <SidebarProvider key={isCompact ? 'compact' : 'wide'} defaultOpen={!isCompact}>
      <RightPanelSlotContext.Provider value={rightPanelSlot}>
        <AppSidebar />
        {/* min-w-0 lets the inset shrink when a detached RightPanel sibling
            claims width, so its content wraps/scrolls instead of overflowing. */}
        <SidebarInset className="flex min-h-0 min-w-0 flex-col">{children}</SidebarInset>
        {/* Slot for page panels that must live *outside* the inset (the main
            container) — portaled here so they render as a sibling card in the
            sidebar flex row. `display: contents` lets the portaled panel be the
            flex child directly. */}
        <div ref={setRightPanelSlot} className="contents" />
      </RightPanelSlotContext.Provider>
    </SidebarProvider>
  );
}

type HeaderProps = PropsWithChildren & {};

const SidebarLayoutHeader = ({ children }: HeaderProps) => {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b">
      <div className="flex items-center gap-2 px-4 w-full">{children}</div>
    </header>
  );
};

SidebarLayoutHeader.displayName = 'SidebarLayout.Header';

const SidebarLayoutContent = ({ children }: PropsWithChildren) => {
  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <div className="p-2 md:p-4 flex-1 flex flex-col min-h-0">{children}</div>
    </main>
  );
};

SidebarLayoutContent.displayName = 'SidebarLayout.Content';

const SidebarLayoutFooter = ({ children }: PropsWithChildren) => {
  return (
    <footer className="border-t py-4 px-4 md:px-6">
      <div className="text-center text-zinc-400">{children}</div>
    </footer>
  );
};

SidebarLayoutFooter.displayName = 'SidebarLayout.Footer';

const SidebarLayoutRightPanel = ({ children }: PropsWithChildren) => {
  const slot = useContext(RightPanelSlotContext);
  if (!slot) return null;
  return createPortal(children, slot);
};

SidebarLayoutRightPanel.displayName = 'SidebarLayout.RightPanel';

SidebarLayout.Header = SidebarLayoutHeader;
SidebarLayout.Content = SidebarLayoutContent;
SidebarLayout.Footer = SidebarLayoutFooter;
SidebarLayout.RightPanel = SidebarLayoutRightPanel;
