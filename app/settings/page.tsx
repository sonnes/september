import type { Metadata } from 'next';

import Layout from '@/components/layout';
import { DesktopNav, MobileNav } from '@/components/nav';
import Alert from '@/components/ui/alert';

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
          {provider === 'supabase' && account && !account.is_approved && (
            <Alert
              type="warning"
              title="Account Pending Approval"
              message="Your account is not approved yet. Please wait for approval."
            />
          )}
          <SpeechProvider>
            <SettingsForm />
          </SpeechProvider>
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
