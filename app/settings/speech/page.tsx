import { redirect } from 'next/navigation';

import Layout from '@/components/layout';
import Navbar, { SettingsTabs } from '@/components/nav';
import { AudioPlayerProvider } from '@/hooks/use-audio-player';
import { AccountProvider } from '@/services/account/context';
import AccountsService from '@/services/account/supabase';
import { createClient } from '@/supabase/server';

import { TalkSettingsForm } from './form';

export default async function TalkSettingsPage() {
  const supabase = await createClient();
  const accountsService = new AccountsService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();

  if (!user || !account) {
    redirect('/login');
  }

  return (
    <AccountProvider provider="supabase" user={user} account={account}>
      <Layout>
        <Layout.Header>
          <Navbar user={user} current="/settings" />
          <SettingsTabs current="/settings/speech" />
        </Layout.Header>
        <Layout.Content>
          <AudioPlayerProvider>
            <TalkSettingsForm />
          </AudioPlayerProvider>
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
