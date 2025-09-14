import type { Metadata } from 'next';

import Layout from '@/components/layout';
import { DesktopNav, MobileNav } from '@/components/nav';

import { AccountProvider, AccountService } from '@/services/account';
import { SpeechProvider } from '@/services/speech';

import { createClient } from '@/supabase/server';

import SettingsForm from './form';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Configure your September communication assistant settings and preferences.',
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const accountsService = new AccountService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();
  const provider = user ? 'supabase' : 'triplit';

  return (
    <AccountProvider provider={provider} user={user!} account={account!}>
      <Layout>
        <Layout.Header>
          <DesktopNav user={user} current="/settings" />
          <MobileNav title="Settings" user={user} current="/settings"></MobileNav>
          <div className="hidden md:flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
          </div>
        </Layout.Header>
        <Layout.Content>
          <SpeechProvider>
            <SettingsForm />
          </SpeechProvider>
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
