import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Write',
  description: 'Create and edit documents.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
