import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import AudioPlayer from '@/components/audio-player';
import { AccountProvider } from '@/components/context/account-provider';
import { MessagesProvider } from '@/components/context/messages-provider';
import { TextProvider } from '@/components/context/text-provider';
import Autocomplete from '@/components/editor/autocomplete';
import Editor from '@/components/editor/simple';
import Suggestions from '@/components/editor/suggestions';
import Layout from '@/components/layout';
import Navbar from '@/components/nav';
import { MessageList, MobileMessageList } from '@/components/talk';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { AudioPlayerProvider } from '@/hooks/use-audio-player';
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
      <MessagesProvider user={user} messages={messages}>
        <AudioPlayerProvider>
          <Layout>
            <Layout.Header>
              <Navbar user={user} current="/talk" />
              <div className="flex items-center justify-between mb-4">
                <Breadcrumbs
                  pages={[{ name: 'Talk', href: '/talk', current: true }]}
                  className="md:hidden"
                />
                <h1 className="hidden md:block text-2xl font-bold tracking-tight text-white">
                  Talk
                </h1>
                <AudioPlayer />
                <div className="flex items-center space-x-2">
                  <MobileMessageList />
                </div>
              </div>
            </Layout.Header>
            <Layout.Content>
              <TextProvider>
                <div className="flex h-[calc(100vh-222px)] md:h-[calc(100vh-256px)]">
                  {/* Left column - Message list */}
                  <div className="hidden md:block w-1/3 lg:w-1/4 px-2 overflow-y-auto border-r border-zinc-200">
                    <div className="max-w-full">
                      <MessageList />
                    </div>
                  </div>

                  {/* Main content area */}
                  <div className="flex-1 flex flex-col px-2 md:px-4 min-w-0 overflow-hidden">
                    {/* Top components - Autocomplete and Suggestions */}
                    <div className="flex flex-col gap-2">
                      <Autocomplete />
                      <Suggestions />
                    </div>

                    {/* Spacer to push editor to bottom */}
                    <div className="flex-1"></div>

                    {/* Editor at bottom */}
                    <div className="flex flex-col py-2">
                      <Editor />
                    </div>
                  </div>
                </div>
              </TextProvider>
            </Layout.Content>
          </Layout>
        </AudioPlayerProvider>
      </MessagesProvider>
    </AccountProvider>
  );
}
