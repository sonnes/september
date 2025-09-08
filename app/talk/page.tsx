import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Cog6ToothIcon, EyeIcon } from '@heroicons/react/24/outline';

import AudioPlayer from '@/components/audio-player';
import { TextProvider } from '@/components/context/text-provider';
import Autocomplete from '@/components/editor/autocomplete';
import Editor from '@/components/editor/simple';
import Suggestions from '@/components/editor/suggestions';
import Layout from '@/components/layout';
import { DesktopNav, MobileNav } from '@/components/nav';
import { MobileMessageList } from '@/components/talk';
import { MessageList } from '@/components/talk/message-list';
import MuteButton from '@/components/talk/mute-button';
import Recorder from '@/components/talk/recorder';

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
                  <div className="flex h-[calc(100vh-100px)] md:h-[calc(100vh-196px)]">
                    {/* Left column - Message list */}
                    <div className="hidden md:block w-1/3 lg:w-1/4 px-2 overflow-y-auto border-r border-zinc-200">
                      <div className="max-w-full">
                        <MessageList />
                      </div>
                    </div>

                    {/* Main content area */}
                    <div className="flex-1 flex flex-col px-2 md:px-4 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-4 border border-zinc-200 rounded-md">
                        <div className="flex-1 min-w-0">
                          <AudioPlayer />
                        </div>
                        <div className="flex-shrink-0">
                          <Recorder />
                        </div>
                      </div>
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
        </AudioProvider>
      </MessagesProvider>
    </AccountProvider>
  );
}
