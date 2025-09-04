import { redirect } from 'next/navigation';

import { AccountProvider } from '@/components/context/account-provider';
import { AudioPlayerProvider } from '@/hooks/use-audio-player';
import AccountsService from '@/services/accounts';
import { createClient } from '@/supabase/server';

import MonitorClient from './monitor-client';

interface MonitorPageProps {
  params: Promise<{ userid: string }>;
}

export default async function MonitorPage({ params }: MonitorPageProps) {
  const { userid } = await params;

  const supabase = await createClient();
  const accountsService = new AccountsService(supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const account = await accountsService.getAccount(user.id);

  return (
    <AccountProvider user={user} account={account}>
      <AudioPlayerProvider>
        <div className="min-h-screen bg-black">
          <MonitorClient userId={userid} />
        </div>
      </AudioPlayerProvider>
    </AccountProvider>
  );
}
