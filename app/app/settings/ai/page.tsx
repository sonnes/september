import { redirect } from 'next/navigation';

import Layout from '@/components/layout';
import Navbar, { SettingsTabs } from '@/components/nav';
import { AccountProvider } from '@/services/account/context';
import AccountsService from '@/services/accounts';
import { createClient } from '@/supabase/server';

import { AISettingsForm } from './form';

export default async function AISettingsPage() {
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
          <SettingsTabs current="/settings/ai" />
        </Layout.Header>
        <Layout.Content>
          <AISettingsForm />
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
