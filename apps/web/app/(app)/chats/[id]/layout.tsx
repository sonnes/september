import type { Metadata } from 'next';

import { EditorProvider } from '@september/editor';
import { SpeechProvider } from '@september/speech';

export const metadata: Metadata = {
  title: 'Chats',
  description: 'Your conversations',
};

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <EditorProvider chatId={id}>
      <SpeechProvider>{children}</SpeechProvider>
    </EditorProvider>
  );
}
