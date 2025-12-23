'use client';

import { useEffect, useState } from 'react';

import { AccountProvider } from '@/packages/account';
import { AISettingsProvider } from '@/packages/ai';
import { AudioPlayerProvider, AudioProvider } from '@/packages/audio';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }
  return (
    <AccountProvider>
      <AISettingsProvider>
        <AudioProvider provider="triplit">
          <AudioPlayerProvider>{children}</AudioPlayerProvider>
        </AudioProvider>
      </AISettingsProvider>
    </AccountProvider>
  );
}
