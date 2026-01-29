import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Clone',
  description: 'Clone your voice for personalized text-to-speech.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
