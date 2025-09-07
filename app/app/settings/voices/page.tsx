import { redirect } from 'next/navigation';

import Layout from '@/components/layout';
import Navbar, { SettingsTabs } from '@/components/nav';
import { Button } from '@/components/ui/button';

import { AccountProvider } from '@/services/account/context';
import AccountsService from '@/services/account/supabase';
import { SpeechProvider } from '@/services/speech/context';

import { createClient } from '@/supabase/server';
import type { Voice } from '@/types/voice';

import VoicesList from './voices-list';

// Voice data fetching using speech service
async function getVoices({ search }: { search?: string }): Promise<{ voices: Voice[] }> {
  // This will be handled by the client-side component using the speech context
  // For server-side rendering, we'll return empty array and let the client fetch
  return { voices: [] };
}

export default async function VoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const supabase = await createClient();
  const accountsService = new AccountsService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();

  if (!user || !account) {
    redirect('/login');
  }

  const { search } = await searchParams;
  const voices = await getVoices({ search });

  return (
    <AccountProvider provider="supabase" user={user} account={account}>
      <SpeechProvider>
        <Layout>
          <Layout.Header>
            <Navbar user={user} current="/settings" />
            <SettingsTabs current="/settings/voices" />
          </Layout.Header>
          <Layout.Content>
            <div className="flex gap-8">
              <VoicesList search={search} />
            </div>
          </Layout.Content>
        </Layout>
      </SpeechProvider>
    </AccountProvider>
  );
}
