import type { Metadata } from 'next';

import AudioPlayer from '@/components/audio-player';
import Editor from '@/components/editor/simple';
import Layout from '@/components/layout';
import { AudioPlayerProvider } from '@/hooks/use-audio-player';

export const metadata: Metadata = {
  title: 'Talk - September',
};

export default function TalkPage() {
  return (
    <AudioPlayerProvider>
      <Layout>
        <Layout.Header>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-white">Talk</h1>
            <div className="flex items-center space-x-2"></div>
          </div>
        </Layout.Header>
        <Layout.Content>
          <Editor />
          <AudioPlayer />
        </Layout.Content>
      </Layout>
    </AudioPlayerProvider>
  );
}
