import type { Metadata } from 'next';

import { EditorProvider } from '@september/editor';
import { KeyboardProvider } from '@september/keyboards';
import { SpeechProvider } from '@september/speech';

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
