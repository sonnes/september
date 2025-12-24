'use client';

import { useSyncExternalStore } from 'react';

import { AccountProvider } from '@/packages/account';
import { AISettingsProvider } from '@/packages/ai';
import { AudioPlayerProvider, AudioProvider } from '@/packages/audio';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!mounted) {
    return null;
  }
  return (
    <AccountProvider>
      <AISettingsProvider>
        <AudioProvider provider="supabase">
          <AudioPlayerProvider>{children}</AudioPlayerProvider>
        </AudioProvider>
      </AISettingsProvider>
    </AccountProvider>
  );
}
