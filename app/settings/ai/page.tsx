import type { Metadata } from 'next';

import Layout from '@/components/layout';
import { DesktopNav, MobileNav } from '@/components/nav';

import { AccountProvider, AccountService } from '@/services/account';

import { createClient } from '@/supabase/server';

import AISettingsForm from './form';

export const metadata: Metadata = {
  title: 'AI Settings',
  description: 'Configure AI provider API keys for September',
};

export default async function AISettingsPage() {
  const supabase = await createClient();
  const accountsService = new AccountService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();
  const provider = user ? 'supabase' : 'triplit';

  return (
    <AccountProvider provider={provider} user={user!} account={account!}>
      <Layout>
        <Layout.Header>
          <DesktopNav user={user} current="/settings/ai" />
          <MobileNav title="AI Settings" user={user} current="/settings/ai"></MobileNav>
          <div className="hidden md:flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-white">AI Settings</h1>
          </div>
        </Layout.Header>
        <Layout.Content>
          <AISettingsForm />
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
