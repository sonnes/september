import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chats',
  description: 'Your conversations',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
