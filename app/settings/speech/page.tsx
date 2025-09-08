import Layout from '@/components/layout';
import Navbar, { SettingsTabs } from '@/components/nav';

import { AudioPlayerProvider } from '@/hooks/use-audio-player';

import { AccountProvider, AccountService } from '@/services/account';

import { createClient } from '@/supabase/server';

import { TalkSettingsForm } from './form';

export default async function TalkSettingsPage() {
  const supabase = await createClient();
  const accountsService = new AccountService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();
  const provider = user ? 'supabase' : 'triplit';

  return (
    <AccountProvider provider={provider} user={user!} account={account!}>
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
