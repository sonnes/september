import { PropsWithChildren } from 'react';

import { getAuthUser } from '@/app/actions/user';
import { AuthProvider } from '@/components/context/auth';
import Navbar from '@/components/navbar';
import { type ThemeColor, themes } from '@/lib/theme';
import { cn } from '@/lib/utils';

type HeaderProps = PropsWithChildren & {
  color?: ThemeColor;
};

export default async function Layout({ children }: PropsWithChildren) {
  const user = await getAuthUser();
  const authUser = user
    ? {
        id: user.id,
        email: user.email ?? '',
      }
    : undefined;
  return (
    <>
      <AuthProvider user={authUser}>
        <div className="min-h-full">{children}</div>
      </AuthProvider>
    </>
  );
}

Layout.Header = ({ children, color = 'indigo' }: HeaderProps) => {
  const theme = themes[color];

  return (
    <div className={cn(theme.bg, 'pb-32')}>
      <Navbar color={color} />
      <header className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
      </header>
    </div>
  );
};

Layout.Content = ({ children }: PropsWithChildren) => {
  return (
    <main className="-mt-32">
      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white px-5 py-6 shadow-sm sm:px-6">{children}</div>
      </div>
    </main>
  );
};
