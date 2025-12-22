import type { Metadata } from 'next';

import { EditorProvider } from '@/packages/editor';
import { KeyboardProvider } from '@/packages/keyboards';
import { SpeechProvider } from '@/packages/speech';

export const metadata: Metadata = {
  title: 'Talk',
  description: 'Speak in your voice',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <EditorProvider>
      <SpeechProvider>
        <KeyboardProvider>{children}</KeyboardProvider>
      </SpeechProvider>
    </EditorProvider>
  );
}
