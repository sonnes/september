'use client';

import { useEffect, useState } from 'react';

import { AccountProvider } from '@/packages/account';
import { AISettingsProvider } from '@/packages/ai';
import { AudioPlayerProvider } from '@/packages/audio';
import { MessagesProvider } from '@/packages/chats';

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
      <MessagesProvider>
        <AISettingsProvider>
          <AudioPlayerProvider>{children}</AudioPlayerProvider>
        </AISettingsProvider>
      </MessagesProvider>
    </AccountProvider>
  );
}
