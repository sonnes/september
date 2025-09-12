import Layout from '@/components/layout';
import Navbar, { SettingsTabs } from '@/components/nav';
import VoicesPageWrapper from '@/components/voices/voices-page-wrapper';

import { AccountProvider, AccountService } from '@/services/account';
import { SpeechProvider } from '@/services/speech/context';

import { createClient } from '@/supabase/server';

export default async function VoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const supabase = await createClient();
  const accountsService = new AccountService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();
  const provider = user ? 'supabase' : 'triplit';

  const { search } = await searchParams;

  return (
    <AccountProvider provider={provider} user={user!} account={account!}>
      <SpeechProvider>
        <Layout>
          <Layout.Header>
            <Navbar user={user} current="/settings" />
            <SettingsTabs current="/settings/voices" />
          </Layout.Header>
          <Layout.Content>
            <div className="flex gap-8">
              <VoicesPageWrapper search={search} />
            </div>
          </Layout.Content>
        </Layout>
      </SpeechProvider>
    </AccountProvider>
  );
}
