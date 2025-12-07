import type { Metadata } from 'next';

import Layout from '@/components/layout';
import { DesktopNav, MobileNav } from '@/components/nav';
import { OnboardingProvider } from '@/components/onboarding/context';
import { Onboarding } from '@/components/onboarding/onboarding';

import { AccountProvider } from '@/services/account/context';
import AccountsService from '@/services/account/supabase';
import { AISettingsProvider } from '@/services/ai/context';
import { SpeechProvider } from '@/services/speech/context';

import { createClient } from '@/supabase/server';

export const metadata: Metadata = {
  title: 'Onboarding',
  description: 'Get started with September',
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const accountsService = new AccountsService(supabase);
  const [user, account] = await accountsService.getCurrentAccount();

  const provider = user ? 'supabase' : 'triplit';

  return (
    <AccountProvider provider={provider} user={user!} account={account!}>
      <AISettingsProvider>
        <SpeechProvider>
          <OnboardingProvider>
            <Layout>
              <Layout.Header>
                <DesktopNav user={user} current="/onboarding" />
                <MobileNav title="Onboarding" user={user} current="/onboarding" />
                <div className="hidden md:flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold tracking-tight text-white">Get Started</h1>
                </div>
              </Layout.Header>

              <Layout.Content>
                <Onboarding />
              </Layout.Content>
            </Layout>
          </OnboardingProvider>
        </SpeechProvider>
      </AISettingsProvider>
    </AccountProvider>
  );
}
