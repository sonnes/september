import type { Metadata } from 'next';

import { OnboardingProvider, OnboardingFlow } from '@/packages/onboarding';
import SidebarLayout from '@/components/sidebar/layout';
import { SpeechProvider } from '@/packages/speech';

export const metadata: Metadata = {
  title: 'Onboarding',
  description: 'Get started with September',
};

export default async function OnboardingPage() {
  return (
    <SpeechProvider>
      <OnboardingProvider>
        <SidebarLayout>
          <SidebarLayout.Header>
            <h1 className="text-2xl font-bold tracking-tight">Get Started</h1>
          </SidebarLayout.Header>

          <SidebarLayout.Content>
            <OnboardingFlow />
          </SidebarLayout.Content>
        </SidebarLayout>
      </OnboardingProvider>
    </SpeechProvider>
  );
}
