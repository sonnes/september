import type { Metadata } from 'next';

import AudioPlayer from '@/components/audio-player';
import Editor from '@/components/editor/simple';
import Layout from '@/components/layout';
import { GridManager } from '@/components/talk/grid-manager';
import { AudioPlayerProvider } from '@/hooks/use-audio-player';
import { TextProvider } from '@/hooks/use-text-context';

export const metadata: Metadata = {
  title: 'Talk - September',
};

export default function TalkPage() {
  return (
    <AudioPlayerProvider>
      <Layout>
        <Layout.Header>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-white">Talk</h1>
            <div className="flex items-center space-x-2"></div>
          </div>
        </Layout.Header>
        <Layout.Content>
          <TextProvider>
            <Editor />
            <GridManager />
          </TextProvider>
          <AudioPlayer />
        </Layout.Content>
      </Layout>
    </AudioPlayerProvider>
  );
}
