import { redirect } from 'next/navigation';

import { AccountProvider } from '@/components/context/account-provider';
import Layout from '@/components/layout';
import Navbar, { SettingsTabs } from '@/components/nav';
import { AudioPlayerProvider } from '@/hooks/use-audio-player';
import AccountsService from '@/services/accounts';
import { createClient } from '@/supabase/server';

import { TalkSettingsForm } from './form';

export default async function TalkSettingsPage() {
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
