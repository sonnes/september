import { ClientProviders } from '@/components/context/client-providers';

// Onboarding runs full-screen, outside the indigo sidebar shell. It still needs
// the client providers (account, AI settings, audio) that the (app) group sets up.
export default function OnboardingGroupLayout({ children }: { children: React.ReactNode }) {
  return <ClientProviders>{children}</ClientProviders>;
}
