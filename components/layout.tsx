import { PropsWithChildren } from 'react';

import { type ThemeColor, themes } from '@/lib/theme';
import { cn } from '@/lib/utils';

type HeaderProps = PropsWithChildren & {
  color?: ThemeColor;
};

export default function Layout({ children }: PropsWithChildren) {
  return <div className="min-h-full flex flex-col">{children}</div>;
}

Layout.Header = ({ children, color = 'indigo' }: HeaderProps) => {
  const theme = themes[color];

  return (
    <div className={cn(theme.bg, 'pb-32')}>
      <header className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
      </header>
    </div>
  );
};

Layout.Content = ({ children }: PropsWithChildren) => {
  return (
    <main className="-mt-32 flex-1">
      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white px-5 py-6 shadow-sm sm:px-6">{children}</div>
      </div>
    </main>
  );
};

Layout.Footer = ({ children }: PropsWithChildren) => {
  return (
    <footer className="border-t py-12">
      <div className="mx-auto max-w-7xl px-4 text-center text-gray-400">{children}</div>
    </footer>
  );
};
