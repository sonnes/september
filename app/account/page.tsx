import Layout from '@/components/layout';
import Navbar, { SettingsTabs } from '@/components/nav';

import { AccountProvider, AccountService } from '@/services/account';

import { createClient } from '@/supabase/server';

import { AccountForm } from './form';

export default async function AccountPage() {
  const supabase = await createClient();
  const accountsService = new AccountService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();
  const provider = user ? 'supabase' : 'triplit';

  return (
    <AccountProvider provider={provider} user={user!} account={account!}>
      <Layout>
        <Layout.Header>
          <Navbar user={user} current="/settings" />
          <SettingsTabs current="/account" />
        </Layout.Header>
        <Layout.Content>
          <AccountForm />
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
