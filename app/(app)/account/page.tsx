import { redirect } from 'next/navigation';

import { AccountProvider } from '@/components/context/account-provider';
import Layout from '@/components/layout';
import Navbar from '@/components/nav';
import Breadcrumbs from '@/components/ui/breadcrumbs';
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
          <Navbar user={user} current="/account" />
          <div className="flex items-center justify-between mb-4">
            <Breadcrumbs
              pages={[{ name: 'Account', href: '/account', current: true }]}
              className="md:hidden"
            />
            <h1 className="hidden md:block text-2xl font-bold tracking-tight text-white">
              Account
            </h1>
          </div>
        </Layout.Header>
        <Layout.Content>
          <AccountForm />
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
