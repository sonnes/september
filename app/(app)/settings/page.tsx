import { redirect } from 'next/navigation';

import { AccountProvider } from '@/components/context/account-provider';
import Layout from '@/components/layout';
import Navbar from '@/components/nav';
import Breadcrumbs from '@/components/ui/breadcrumbs';
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
          <div className="flex items-center justify-between mb-4">
            <Breadcrumbs
              pages={[{ name: 'Settings', href: '/settings', current: true }]}
              className="md:hidden"
            />
            <h1 className="hidden md:block text-2xl font-bold tracking-tight text-white">Talk</h1>
          </div>
        </Layout.Header>
        <Layout.Content>
          <AISettingsForm />
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
