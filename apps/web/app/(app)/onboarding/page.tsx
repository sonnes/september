'use client';

import SidebarLayout from '@/components/sidebar/layout';

import { OnboardingFlow, OnboardingProvider } from '@september/onboarding';
import { SpeechProvider } from '@september/speech';

export default function OnboardingPage() {
  return (
    <>
      <SpeechProvider>
        <OnboardingProvider>
          <SidebarLayout.Header>
            <h1 className="text-2xl font-bold tracking-tight">Get Started</h1>
          </SidebarLayout.Header>

          <SidebarLayout.Content>
            <OnboardingFlow />
          </SidebarLayout.Content>
        </OnboardingProvider>
      </SpeechProvider>
    </>
  );
}
