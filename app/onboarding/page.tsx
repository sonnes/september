import type { Metadata } from 'next';

import { OnboardingProvider } from '@/components/onboarding/context';
import { Onboarding } from '@/components/onboarding/onboarding';

import { AccountProvider } from '@/services/account/context';
import AccountsService from '@/services/account/supabase';
import { AISettingsProvider } from '@/services/ai/context';
import { SpeechProvider } from '@/services/speech/context';

import SidebarLayout from '@/components-v4/sidebar/layout';
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
            <SidebarLayout user={user!}>
              <SidebarLayout.Header>
                <h1 className="text-2xl font-bold tracking-tight">Get Started</h1>
              </SidebarLayout.Header>

              <SidebarLayout.Content>
                <Onboarding />
              </SidebarLayout.Content>
            </SidebarLayout>
          </OnboardingProvider>
        </SpeechProvider>
      </AISettingsProvider>
    </AccountProvider>
  );
}
