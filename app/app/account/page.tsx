import { redirect } from 'next/navigation';

import { AccountProvider } from '@/components/context/account-provider';
import Layout from '@/components/layout';
import Navbar, { SettingsTabs } from '@/components/nav';
import AccountsService from '@/services/accounts';
import { createClient } from '@/supabase/server';

import { AccountForm } from './form';

export default async function AccountPage() {
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
          <SettingsTabs current="/account" />
        </Layout.Header>
        <Layout.Content>
          <AccountForm />
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
