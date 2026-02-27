'use client';

import { useSyncExternalStore } from 'react';

import { AccountProvider } from '@september/account';
import { AISettingsProvider } from '@september/ai';
import { AudioPlayerProvider, AudioProvider } from '@september/audio';

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
        <AudioProvider>
          <AudioPlayerProvider>{children}</AudioPlayerProvider>
        </AudioProvider>
      </AISettingsProvider>
    </AccountProvider>
  );
}
