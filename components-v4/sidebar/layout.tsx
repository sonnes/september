import { PropsWithChildren } from 'react';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import { User } from '@/types/user';

import { AppSidebar } from './app-sidebar';

type SidebarLayoutProps = PropsWithChildren & {
  defaultOpen?: boolean;
  user?: User;
};

export default function SidebarLayout({ children, defaultOpen = true, user }: SidebarLayoutProps) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar user={user} />
      <SidebarInset className="min-h-screen flex flex-col">{children}</SidebarInset>
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
    <main className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-6">{children}</div>
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
