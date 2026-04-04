import type { Metadata } from 'next';

import { ClientProviders } from '@/components/context/client-providers';

export const metadata: Metadata = {
  title: 'Presentation',
  description: 'Document slide presentation',
};

export default function PresentLayout({ children }: { children: React.ReactNode }) {
  return <ClientProviders>{children}</ClientProviders>;
}
