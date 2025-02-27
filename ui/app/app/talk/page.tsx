import { PlayCircleIcon } from '@heroicons/react/24/outline';

import { getMessages } from '@/app/actions/messages';
import { Heading } from '@/components/catalyst/heading';
import { MessagesProvider } from '@/components/context/messages';
import { PlayerProvider } from '@/components/context/player';
import Editor from '@/components/editor/simple';
import Layout from '@/components/layout';
import type { Message } from '@/supabase/types';

import { MessageList } from './message-list';
import { PlayButton } from './play-button';
import { Player } from './player';
import Transcription from './transcription';

export const metadata = {
  title: 'Talk - September',
};

export default async function TalkPage() {
  const messages = await getMessages().then(messages => messages.reverse());

  return (
    <MessagesProvider messages={messages}>
      <PlayerProvider>
        <Layout>
          <Layout.Header>
            <h1 className="text-3xl font-bold tracking-tight text-white">Talk</h1>
          </Layout.Header>
          <Layout.Content>
            <div className="flex flex-col h-[calc(100vh-280px)]">
              <div className="p-4 mb-4 bg-white rounded-lg shadow-xs ring-1 ring-zinc-950/5">
                <div className="flex items-center justify-between">
                  <Player />
                  <div className="border-l border-zinc-200 h-12 mx-4" />
                  <Transcription />
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto">
                <MessageList />
              </div>

              {/* Input area */}
              <div className="pt-2 border-t border-zinc-200">
                <Editor />
              </div>
            </div>
          </Layout.Content>
        </Layout>
      </PlayerProvider>
    </MessagesProvider>
  );
}
