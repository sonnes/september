import { createFileRoute, Outlet } from '@tanstack/react-router';

import { ClientProviders } from '@/components/context/client-providers';

// Onboarding runs full-screen, outside the sidebar shell. It still needs
// the client providers (account, AI settings, audio) that the _app group sets up.
export const Route = createFileRoute('/_onboarding')({
  component: OnboardingGroupLayout,
});

function OnboardingGroupLayout() {
  return (
    <ClientProviders>
      <Outlet />
    </ClientProviders>
  );
}
