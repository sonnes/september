import { redirect } from 'next/navigation';

import { AccountProvider } from '@/components/context/account-provider';
import Layout from '@/components/layout';
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
          <h1 className="text-2xl font-bold tracking-tight text-white">Account Settings</h1>
        </Layout.Header>
        <Layout.Content>
          <AccountForm />
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
