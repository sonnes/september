import { PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

type HeaderProps = PropsWithChildren & {
};

export default function Layout({ children }: PropsWithChildren) {
  return <div className="min-h-full flex flex-col">{children}</div>;
}

const LayoutHeader = ({ children }: HeaderProps) => {

  return (
    <div className="bg-indigo-500 pb-32">
      <header>
        <div className="mx-auto max-w-7xl px-2 md:px-8">{children}</div>
      </header>
    </div>
  );
};

LayoutHeader.displayName = 'Layout.Header';

const LayoutContent = ({ children }: PropsWithChildren) => {
  return (
    <main className="-mt-32 flex-1">
      <div className="mx-auto max-w-7xl px-2 md:px-8">
        <div className="rounded-lg bg-white p-2 md:p-6">{children}</div>
      </div>
    </main>
  );
};

LayoutContent.displayName = 'Layout.Content';

const LayoutFooter = ({ children }: PropsWithChildren) => {
  return (
    <footer className="border-t py-6 md:py-12 px-2 md:px-8">
      <div className="mx-auto max-w-7xl text-center text-zinc-400">{children}</div>
    </footer>
  );
};

LayoutFooter.displayName = 'Layout.Footer';

Layout.Header = LayoutHeader;
Layout.Content = LayoutContent;
Layout.Footer = LayoutFooter;
