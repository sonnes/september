import { redirect } from 'next/navigation';

import { AccountProvider } from '@/components/context/account-provider';
import Layout from '@/components/layout';
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
          <div className="space-y-4">
            <Breadcrumbs
              pages={[
                { name: 'Settings', href: '/account' },
                { name: 'AI Settings', href: '/settings/ai', current: true },
              ]}
            />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">AI Settings</h1>
          </div>
        </Layout.Header>
        <Layout.Content>
          <AISettingsForm />
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
