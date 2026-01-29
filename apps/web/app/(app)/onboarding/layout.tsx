import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Onboarding',
  description: 'Set up your September profile and preferences.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
