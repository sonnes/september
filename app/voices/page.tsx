import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import Layout from '@/components/layout';
import { DesktopNav, MobileNav } from '@/components/nav';
import VoicesPageWrapper from '@/components/voices/voices-page-wrapper';

import { AccountProvider, AccountService } from '@/services/account';
import { AISettingsProvider } from '@/services/ai/context';
import { SpeechProvider } from '@/services/speech/context';

import { createClient } from '@/supabase/server';

export const metadata: Metadata = {
  title: 'Voices',
  description: 'Manage and customize your voice settings for text-to-speech communication.',
};

export default async function VoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const supabase = await createClient();
  const accountsService = new AccountService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();

  if (account && !account.is_approved) {
    redirect('/settings');
  }

  const provider = user ? 'supabase' : 'triplit';

  const { search } = await searchParams;

  return (
    <AccountProvider provider={provider} user={user!} account={account!}>
      <AISettingsProvider>
        <SpeechProvider>
          <Layout>
            <Layout.Header>
              <DesktopNav user={user} current="/voices" />
              <MobileNav title="Voices" user={user} current="/voices"></MobileNav>
              <div className="hidden md:flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold tracking-tight text-white">Voices</h1>
              </div>
            </Layout.Header>
            <Layout.Content>
              <div className="flex justify-center">
                <div className="w-full max-w-4xl">
                  <VoicesPageWrapper search={search} />
                </div>
              </div>
            </Layout.Content>
          </Layout>
        </SpeechProvider>
      </AISettingsProvider>
    </AccountProvider>
  );
}
