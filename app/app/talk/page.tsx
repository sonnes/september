import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Cog6ToothIcon, EyeIcon } from '@heroicons/react/24/outline';

import { TextProvider } from '@/components/context/text-provider';
import Layout from '@/components/layout';
import { DesktopNav, MobileNav } from '@/components/nav';
import { MobileMessageList, TalkPageContent } from '@/components/talk';
import MuteButton from '@/components/talk/mute-button';

import { AudioPlayerProvider } from '@/hooks/use-audio-player';

import { AccountProvider } from '@/services/account/context';
import AccountsService from '@/services/account/supabase';
import { AudioProvider } from '@/services/audio/context';
import { MessagesProvider, MessagesService } from '@/services/messages';

import { createClient } from '@/supabase/server';

export const metadata: Metadata = {
  title: 'Talk - September',
};

export default async function TalkPage() {
  const supabase = await createClient();
  const accountsService = new AccountsService(supabase);
  const messagesService = new MessagesService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();
  const provider = user ? 'supabase' : 'triplit';

  const messages = user ? await messagesService.getMessages(user.id) : [];

  const actions = (
    <div className="flex items-center space-x-2">
      <MuteButton />
      <MobileMessageList />
      <Link
        href="/settings/speech"
        className="p-2 text-white rounded-full transition-colors cursor-pointer"
      >
        <Cog6ToothIcon className="w-6 h-6" />{' '}
      </Link>
      <Link
        href={`/monitor`}
        className="p-2 text-white rounded-full transition-colors cursor-pointer"
      >
        <EyeIcon className="w-6 h-6" />
      </Link>
    </div>
  );

  return (
    <AccountProvider provider={provider} user={user!} account={account!}>
      <MessagesProvider provider={provider} messages={messages!}>
        <AudioProvider provider={provider}>
          <AudioPlayerProvider>
            <Layout>
              <Layout.Header>
                <DesktopNav user={user} current="/talk" />
                <MobileNav title="Talk" user={user} current="/talk">
                  {actions}
                </MobileNav>
                <div className="hidden md:flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold tracking-tight text-white">Talk</h1>
                  {actions}
                </div>
              </Layout.Header>

              <Layout.Content>
                <TextProvider>
                  <TalkPageContent />
                </TextProvider>
              </Layout.Content>
            </Layout>
          </AudioPlayerProvider>
        </AudioProvider>
      </MessagesProvider>
    </AccountProvider>
  );
}
