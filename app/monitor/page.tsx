'use client';

import { ClientProviders } from '@/components/context/client-providers';
import MonitorClient from './monitor-client';

export default function MonitorPage() {
  return (
    <ClientProviders>
      <div className="min-h-screen bg-black">
        <MonitorClient />
      </div>
    </ClientProviders>
  );
}
