import type { Metadata } from 'next';

import Layout from '@/components/layout';
import { DesktopNav } from '@/components/nav';
import { MobileNav } from '@/components/nav';

import { AccountProvider } from '@/services/account/context';
import AccountsService from '@/services/account/supabase';

import { createClient } from '@/supabase/server';

import { OnboardingClient } from './onboarding-client';

export const metadata: Metadata = {
  title: 'Welcome to September',
  description: 'Get started with September by setting up your AI providers and preferences.',
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const accountsService = new AccountsService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();
  const provider = user ? 'supabase' : 'triplit';

  return (
    <AccountProvider provider={provider} user={user!} account={account!}>
      <Layout>
        <Layout.Header>
          <DesktopNav user={user} current="/onboarding" />
          <MobileNav title="Let's get started" user={user} current="/onboarding"></MobileNav>
          <div className="hidden md:flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-white">Let&apos;s get started</h1>
          </div>
        </Layout.Header>
        <Layout.Content>
          <OnboardingClient />
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
