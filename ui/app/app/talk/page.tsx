import { PlayCircleIcon } from '@heroicons/react/24/outline';

import { getMessages } from '@/app/actions/messages';
import { Heading } from '@/components/catalyst/heading';
import { MessagesProvider } from '@/components/context/messages';
import { PlayerProvider } from '@/components/context/player';
import Editor from '@/components/editor/simple';
import Layout from '@/components/layout';
import type { Message } from '@/supabase/types';

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
              <div className="p-4 mb-4 bg-white rounded-lg shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-800 dark:ring-white/10">
                <div className="flex items-center justify-between">
                  <Player />
                  <div className="border-l border-zinc-200 dark:border-zinc-700 h-12 mx-4" />
                  <Transcription />
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto">
                <MessageList messages={messages} />
              </div>

              {/* Input area */}
              <div>
                <Editor />
              </div>
            </div>
          </Layout.Content>
        </Layout>
      </PlayerProvider>
    </MessagesProvider>
  );
}

function Message({ message }: { message: Message }) {
  return (
    <div
      className={`mb-4 p-3 bg-zinc-50 rounded-lg w-full dark:bg-zinc-800 ${
        message.type === 'transcription' ? 'bg-red-100 dark:bg-red-900' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>{message.text}</div>
        {message.type === 'message' && <PlayButton id={message.id} text={message.text} />}
      </div>
    </div>
  );
}

function MessageList({ messages }: { messages: Message[] }) {
  return (
    <>
      {messages.map((message, index) => (
        <Message key={index} message={message} />
      ))}
    </>
  );
}
