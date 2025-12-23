import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your September account and preferences.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
