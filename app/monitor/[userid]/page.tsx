import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AudioPlayerProvider } from '@/hooks/use-audio-player';

import { AccountProvider } from '@/services/account/context';
import AccountsService from '@/services/account/supabase';

import { createClient } from '@/supabase/server';

import MonitorClient from './monitor-client';

export const metadata: Metadata = {
  title: 'Monitor',
  description: 'Monitor communication activity and usage statistics.',
  robots: {
    index: false,
    follow: false,
  },
};

interface MonitorPageProps {
  params: Promise<{ userid: string }>;
}

export default async function MonitorPage({ params }: MonitorPageProps) {
  const { userid } = await params;

  const supabase = await createClient();
  const accountsService = new AccountsService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();

  if (!user || !account) {
    redirect('/login');
  }

  return (
    <AccountProvider provider="supabase" user={user} account={account}>
      <AudioPlayerProvider>
        <div className="min-h-screen bg-black">
          <MonitorClient userId={userid} />
        </div>
      </AudioPlayerProvider>
    </AccountProvider>
  );
}
