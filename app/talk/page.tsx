import type { Metadata } from 'next';
import Link from 'next/link';

import { Cog6ToothIcon, EyeIcon } from '@heroicons/react/24/outline';

import { TextProvider } from '@/components/context/text-provider';
import Layout from '@/components/layout';
import { DesktopNav, MobileNav } from '@/components/nav';
import { MobileMessageList } from '@/components/talk';
import { TalkPageContent } from '@/components/talk';
import MuteButton from '@/components/talk/mute-button';

import { AudioPlayerProvider } from '@/hooks/use-audio-player';

import { AccountProvider } from '@/services/account/context';
import { AudioProvider } from '@/services/audio/context';
import { MessagesProvider } from '@/services/messages';

export const metadata: Metadata = {
  title: 'Talk - September',
};

export default async function TalkPage() {
  const actions = (
    <div className="flex items-center space-x-2">
      <MuteButton />
      <MobileMessageList />

      <Link
        href={`/monitor/local-user`}
        className="p-2 text-white rounded-full transition-colors cursor-pointer"
      >
        <EyeIcon className="w-6 h-6" />
      </Link>
      <Link
        href="/settings/speech"
        className="px-2 py-4 text-zinc-500 rounded-full transition-colors cursor-pointer"
      >
        <Cog6ToothIcon className="w-5 h-5" />
      </Link>
    </div>
  );

  return (
    <AccountProvider provider="triplit">
      <MessagesProvider provider="triplit">
        <AudioProvider provider="triplit">
          <AudioPlayerProvider>
            <Layout>
              <Layout.Header>
                <DesktopNav user={null} current="/talk" />
                <MobileNav title="Talk" user={null} current="/talk">
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
