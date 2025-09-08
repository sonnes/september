import { redirect } from 'next/navigation';

import Layout from '@/components/layout';
import Navbar, { SettingsTabs } from '@/components/nav';
import { AccountProvider } from '@/services/account/context';
import AccountsService from '@/services/account/supabase';
import { createClient } from '@/supabase/server';

import { AccountForm } from './form';

export default async function AccountPage() {
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
          <SettingsTabs current="/account" />
        </Layout.Header>
        <Layout.Content>
          <AccountForm />
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
