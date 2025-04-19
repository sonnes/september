import { redirect } from 'next/navigation';

import { getAccount } from '@/app/actions/account';
import { AccountProvider } from '@/components/context/auth';
import Layout from '@/components/layout';

import OnboardingForm from './form';

export default async function AppPage() {
  const account = await getAccount();

  if (account.onboarding_completed) {
    redirect('/app/talk');
  }

  return (
    <Layout>
      <Layout.Header>
        <div className="flex items-center gap-4">
          <div className="text-4xl">👋</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Welcome! Let's get started
            </h1>
            <p className="mt-2 text-gray-50">
              Follow these steps to set up your account and start using your assistant.
            </p>
          </div>
        </div>
      </Layout.Header>
      <Layout.Content>
        <AccountProvider account={account}>
          <OnboardingForm />
        </AccountProvider>
      </Layout.Content>
    </Layout>
  );
}
