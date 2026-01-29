import type { Metadata } from 'next';

import { EditorProvider } from '@september/editor';
import { SpeechProvider } from '@september/speech';

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
