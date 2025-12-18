import type { Metadata } from 'next';

import { EditorProvider } from '@/components/editor/context';
import { SpeechProvider } from '@/components/speech/context';

export const metadata: Metadata = {
  title: 'Chats',
  description: 'Your conversations',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <EditorProvider>
      <SpeechProvider>{children}</SpeechProvider>
    </EditorProvider>
  );
}
