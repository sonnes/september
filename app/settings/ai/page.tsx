import Layout from '@/components/layout';
import Navbar, { SettingsTabs } from '@/components/nav';

import { AccountProvider, AccountService } from '@/services/account';

import { createClient } from '@/supabase/server';

import { AISettingsForm } from './form';

export default async function AISettingsPage() {
  const supabase = await createClient();
  const accountsService = new AccountService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();
  const provider = user ? 'supabase' : 'triplit';

  return (
    <AccountProvider provider={provider} user={user!} account={account!}>
      <Layout>
        <Layout.Header>
          <Navbar user={user} current="/settings" />
          <SettingsTabs current="/settings/ai" />
        </Layout.Header>
        <Layout.Content>
          <AISettingsForm />
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
