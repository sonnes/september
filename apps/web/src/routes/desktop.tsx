'use client';

import { useEffect } from 'react';

import { Navigate, createFileRoute, useNavigate } from '@tanstack/react-router';

import { BrandMark, BrandWordmark } from '@/components/brand';
import { ClientProviders } from '@/components/context/client-providers';

import { pageTitle } from '@/lib/seo';
import { useAccount } from '@/packages/account';
import { isDesktopRuntime, readDesktopLastRoute } from '@/packages/shared/lib/data';

export const Route = createFileRoute('/desktop')({
  head: () => ({
    meta: [
      { title: pageTitle('Welcome') },
      { name: 'description', content: 'Start the September desktop app.' },
    ],
  }),
  component: DesktopStartPage,
});

function DesktopStartPage() {
  if (!isDesktopRuntime()) return <Navigate to="/" replace />;
  return (
    <ClientProviders>
      <DesktopStartContent />
    </ClientProviders>
  );
}

export function DesktopStartContent() {
  const navigate = useNavigate();
  const { account, loading } = useAccount();
  const name = account?.name.trim();

  useEffect(() => {
    if (loading || !account) return;
    let cancelled = false;

    const resolveStartRoute = async () => {
      if (!account.onboarding_completed) return '/onboarding';
      return (await readDesktopLastRoute()) ?? '/spaces';
    };

    void resolveStartRoute()
      .then(href => {
        if (!cancelled) navigate({ href, replace: true });
      })
      .catch(error => {
        console.error('Failed to restore the desktop route:', error);
        if (!cancelled) navigate({ href: '/spaces', replace: true });
      });

    return () => {
      cancelled = true;
    };
  }, [account, loading, navigate]);

  return (
    <main className="grid min-h-dvh place-items-center bg-muted px-6 py-12">
      <section className="w-full max-w-xl rounded-surface border bg-card p-8 text-center shadow-sm sm:p-12">
        <div className="flex items-center justify-center gap-4">
          <BrandMark size={64} className="size-16" />
          <BrandWordmark className="text-3xl" />
        </div>
        <p className="mt-6 text-sm font-medium text-primary">Desktop app</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {name ? `Welcome, ${name}` : 'Welcome to September'}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
          Preparing your communication space.
        </p>
      </section>
    </main>
  );
}
