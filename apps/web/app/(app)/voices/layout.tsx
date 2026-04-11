import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Voices',
  description: 'Browse and find voices similar to your cloned voice.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
