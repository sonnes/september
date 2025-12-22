import type { Metadata } from 'next';

import { AudioPlayerProvider } from '@/packages/audio';

import MonitorClient from './monitor-client';

export const metadata: Metadata = {
  title: 'Monitor',
  description: 'Share video and voice with others using September.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MonitorPage() {
  return (
    <AudioPlayerProvider>
      <div className="min-h-screen bg-black">
        <MonitorClient />
      </div>
    </AudioPlayerProvider>
  );
}
