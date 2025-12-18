import type { Metadata } from 'next';

import { RecordingProvider, UploadProvider } from '@/components/voices/clone';

export const metadata: Metadata = {
  title: 'Clone Your Voice',
  description: 'Create a digital clone of your voice using AI.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <UploadProvider>
      <RecordingProvider>{children}</RecordingProvider>
    </UploadProvider>
  );
}

