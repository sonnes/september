import { getAccount } from '@/app/actions/account';
import { getVoices } from '@/app/actions/voices';
import { AccountProvider } from '@/components/context/auth';
import Layout from '@/components/layout';

import Help from './help';
import VoicesList from './voices-list';

export const metadata = {
  title: 'Voices',
  description: 'Manage your voices.',
};

export default async function ClonePage({
  searchParams,
}: {
  searchParams: Promise<{ search: string }>;
}) {
  const { search } = await searchParams;
  const [account, voices] = await Promise.all([getAccount(), getVoices({ search })]);

  return (
    <AccountProvider account={account}>
      <Layout>
        <Layout.Header>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-white">Voices</h1>
            <Help />
          </div>
        </Layout.Header>
        <Layout.Content>
          <div className="flex gap-8">
            <VoicesList voices={voices.voices} />
          </div>
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
