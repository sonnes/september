import { AudioPlayerProvider } from '@/hooks/use-audio-player';

import MonitorClient from './monitor-client';

interface MonitorPageProps {
  params: Promise<{ userid: string }>;
}

export default async function MonitorPage({ params }: MonitorPageProps) {
  const { userid } = await params;

  return (
    <AudioPlayerProvider>
      <div className="min-h-screen bg-black">
        <MonitorClient userId={userid} />
      </div>
    </AudioPlayerProvider>
  );
}
