import { getAccount } from '@/app/app/account/actions';
import { Heading } from '@/components/catalyst/heading';
import { AccountProvider } from '@/components/context/auth';
import Layout from '@/components/layout';

import VoiceCloneForm from './form';

export const metadata = {
  title: 'Clone Your Voice',
  description: 'Create a new voice clone.',
};

export default async function ClonePage() {
  const account = await getAccount();

  return (
    <AccountProvider account={account}>
      <Layout>
        <Layout.Header>
          <h1 className="text-3xl font-bold tracking-tight text-white">Clone Your Voice</h1>
        </Layout.Header>
        <Layout.Content>
          <div className="flex flex-col h-[calc(100vh-288px)]">
            <VoiceCloneForm />
          </div>
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
