import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import AudioPlayer from '@/components/audio-player';
import { AccountProvider } from '@/components/context/account-provider';
import { MessagesProvider } from '@/components/context/messages-provider';
import Autocomplete from '@/components/editor/autocomplete';
import Editor from '@/components/editor/simple';
import Suggestions from '@/components/editor/suggestions';
import Layout from '@/components/layout';
import { GridManager } from '@/components/talk/grid-manager';
import { AudioPlayerProvider } from '@/hooks/use-audio-player';
import { TextProvider } from '@/hooks/use-text-context';
import AccountsService from '@/services/accounts';
import MessagesService from '@/services/messages';
import { createClient } from '@/supabase/server';

export const metadata: Metadata = {
  title: 'Talk - September',
};

export default async function TalkPage() {
  const supabase = await createClient();
  const accountsService = new AccountsService(supabase);
  const messagesService = new MessagesService(supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [account, messages] = await Promise.all([
    accountsService.getAccount(user.id),
    messagesService.getMessages(user.id),
  ]);

  return (
    <AccountProvider user={user} account={account}>
      <AudioPlayerProvider>
        <Layout>
          <Layout.Header>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight text-white">Talk</h1>
              <div className="flex items-center space-x-2"></div>
            </div>
          </Layout.Header>
          <Layout.Content>
            <MessagesProvider user={user} messages={messages}>
              <TextProvider>
                <div className="flex flex-col gap-2">
                  <Autocomplete />
                  <Suggestions />
                  <Editor />
                </div>
              </TextProvider>
            </MessagesProvider>
            <AudioPlayer />
          </Layout.Content>
        </Layout>
      </AudioPlayerProvider>
    </AccountProvider>
  );
}
