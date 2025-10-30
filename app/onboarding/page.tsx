import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AccountProvider } from '@/services/account/context';
import AccountsService from '@/services/account/supabase';
import { createClient } from '@/supabase/server';

import { OnboardingWizardContainer } from './onboarding-wizard-container';

export const metadata: Metadata = {
  title: 'Welcome to September',
  description: 'Get started with September by setting up your AI providers and preferences.',
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const accountsService = new AccountsService(supabase);

  // Get the current user and account
  const [user, account] = await accountsService.getCurrentAccount();

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/login');
  }

  // Redirect to /talk if onboarding is already completed
  if (account?.onboarding_completed) {
    redirect('/talk');
  }

  const provider = user ? 'supabase' : 'triplit';

  // Render OnboardingWizard wrapped in AccountProvider
  return (
    <AccountProvider provider={provider} user={user!} account={account!}>
      <OnboardingWizardContainer />
    </AccountProvider>
  );
}
