import type { Metadata } from 'next';

import { DocumentsProvider } from '@/packages/documents';

export const metadata: Metadata = {
  title: 'Write',
  description: "Create and edit documents with September's writing assistant.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DocumentsProvider>{children}</DocumentsProvider>;
}
