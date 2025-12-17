import type { Metadata } from 'next';

import { EditorProvider } from '@/components-v4/editor/context';
import { SpeechProvider } from '@/components-v4/speech/context';

export const metadata: Metadata = {
  title: 'Talk',
  description: 'Speak in your voice',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <EditorProvider>
      <SpeechProvider>{children}</SpeechProvider>
    </EditorProvider>
  );
}
