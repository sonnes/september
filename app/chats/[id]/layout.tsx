import type { Metadata } from 'next';

import { EditorProvider } from '@/components-v4/editor/context';
import { SpeechProvider } from '@/components-v4/speech/context';

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
