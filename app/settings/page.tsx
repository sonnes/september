import Layout from '@/components/layout';
import Navbar from '@/components/nav';

import { AudioPlayerProvider } from '@/hooks/use-audio-player';

import { AccountProvider, AccountService } from '@/services/account';
import { SpeechProvider } from '@/services/speech';

import { createClient } from '@/supabase/server';

import SettingsForm from './form';

export default async function SettingsPage() {
  const supabase = await createClient();
  const accountsService = new AccountService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();
  const provider = user ? 'supabase' : 'triplit';

  return (
    <AccountProvider provider={provider} user={user!} account={account!}>
      <Layout>
        <Layout.Header>
          <Navbar user={user} current="/settings" />
        </Layout.Header>
        <Layout.Content>
          <SpeechProvider>
            <SettingsForm />
          </SpeechProvider>
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
