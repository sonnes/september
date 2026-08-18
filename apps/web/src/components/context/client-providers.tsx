'use client';

import { useSyncExternalStore } from 'react';

import { AccountProvider } from '@/packages/account';
import { AISettingsProvider } from '@/packages/ai';
import { AudioPlayerProvider } from '@/packages/audio';
import { DataQueryProvider, DesktopRouteTracker } from '@/packages/shared/lib/data';
import { SyncProvider } from '@/packages/sync';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!mounted) {
    return null;
  }
  return (
    <DataQueryProvider>
      <DesktopRouteTracker />
      <SyncProvider>
        <AccountProvider>
          <AISettingsProvider>
            <AudioPlayerProvider>{children}</AudioPlayerProvider>
          </AISettingsProvider>
        </AccountProvider>
      </SyncProvider>
    </DataQueryProvider>
  );
}
