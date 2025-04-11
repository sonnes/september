import { getMessages } from '@/app/actions/messages';
import { MessagesProvider } from '@/components/context/messages';
import { PlayerProvider } from '@/components/context/player';
import Editor from '@/components/editor/simple';
import Layout from '@/components/layout';

import { SettingsProvider, TalkSettings } from './context';
import Help from './help';
import { MessageList } from './message-list';
import { Player } from './player';
import Settings from './settings';
import Transcription from './transcription';

export const metadata = {
  title: 'Talk - September',
};

const defaultSettings: TalkSettings = {
  model_id: 'eleven_multilingual_v2',
  speed: 1,
  stability: 0.5,
  similarity: 0.5,
  style: 0.0,
  speaker_boost: false,
};

export default async function TalkPage() {
  const messages = await getMessages().then(messages => messages.reverse());

  return (
    <MessagesProvider messages={messages}>
      <SettingsProvider defaultSettings={defaultSettings}>
        <PlayerProvider>
          <Layout>
            <Layout.Header>
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-white">Talk</h1>
                <div className="flex items-center space-x-2">
                  <Help />
                  <Settings />
                </div>
              </div>
            </Layout.Header>
            <Layout.Content>
              <div className="flex flex-col h-[calc(100vh-280px)]">
                <div className="p-4 mb-4 bg-white rounded-lg shadow-xs ring-1 ring-zinc-950/5">
                  <div className="flex items-center justify-between">
                    <Player />
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
      </SettingsProvider>
    </MessagesProvider>
  );
}
