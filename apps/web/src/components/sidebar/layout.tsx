'use client';

import { PropsWithChildren } from 'react';

import { SidebarInset, SidebarProvider } from '@/packages/ui/components/sidebar';

import { User, useIsCompact } from '@/packages/shared';

import { AppSidebar } from './app-sidebar';

export default function SidebarLayout({ children }: PropsWithChildren) {
  // iPad 13" is the base viewport: at or below it the sidebar defaults to an
  // icon rail, wider screens to the full sidebar. Keying the provider on the
  // breakpoint re-applies the viewport default when it flips; a manual toggle
  // (rail or ⌘/Ctrl-B) wins until then.
  const isCompact = useIsCompact();

  return (
    <SidebarProvider key={isCompact ? 'compact' : 'wide'} defaultOpen={!isCompact}>
      <AppSidebar />
      <SidebarInset className="flex min-h-0 flex-col">{children}</SidebarInset>
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

SidebarLayout.Header = SidebarLayoutHeader;
SidebarLayout.Content = SidebarLayoutContent;
SidebarLayout.Footer = SidebarLayoutFooter;
