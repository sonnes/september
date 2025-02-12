import { Metadata } from 'next';

import { AccountProvider } from '@/components/context/auth';
import Layout from '@/components/layout';

import { getAccount } from './actions';
import AccountForm from './form';

export const metadata: Metadata = {
  title: 'Your Account',
  description: 'Your account information',
};

export default async function AccountPage() {
  const account = await getAccount();

  return (
    <Layout>
      <Layout.Header>
        <h1 className="text-3xl font-bold tracking-tight text-white">Your Account</h1>
      </Layout.Header>
      <Layout.Content>
        <AccountProvider account={account}>
          <AccountForm />
        </AccountProvider>
      </Layout.Content>
    </Layout>
  );
}
