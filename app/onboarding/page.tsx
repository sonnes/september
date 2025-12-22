'use client';

import { ClientProviders } from '@/components/context/client-providers';
import { OnboardingProvider, OnboardingFlow } from '@/packages/onboarding';
import SidebarLayout from '@/components/sidebar/layout';
import { SpeechProvider } from '@/packages/speech';

export default function OnboardingPage() {
  return (
    <ClientProviders>
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
    </ClientProviders>
  );
}
