import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AccountProvider } from '@/packages/account';
import AccountsService from '@/packages/account';
import { AudioPlayerProvider } from '@/packages/audio';

import { createClient } from '@/supabase/server';

import MonitorClient from './monitor-client';

export const metadata: Metadata = {
  title: 'Monitor',
  description: 'Share video and voice with others using September.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MonitorPage() {
  const supabase = await createClient();
  const accountsService = new AccountsService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();

  if (account && !account.is_approved) {
    redirect('/onboarding');
  }

  const provider = user ? 'supabase' : 'triplit';

  return (
    <AccountProvider provider={provider} user={user!} account={account!}>
      <AudioPlayerProvider>
        <div className="min-h-screen bg-black">
          <MonitorClient />
        </div>
      </AudioPlayerProvider>
    </AccountProvider>
  );
}
