import type { Metadata } from 'next';

import { ClientProviders } from '@/components/context/client-providers';

export const metadata: Metadata = {
  title: 'Display',
  description: 'Chat display popup',
};

export default function DisplayLayout({ children }: { children: React.ReactNode }) {
  return <ClientProviders>{children}</ClientProviders>;
}
