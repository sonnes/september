'use client';

import { OnboardingFlow, OnboardingProvider } from '@september/onboarding';
import { SpeechProvider } from '@september/speech';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

export default function OnboardingPage() {
  return (
    <SpeechProvider>
      <OnboardingProvider>
        <SidebarLayout.Header>
          <PageHeader breadcrumbs={[{ label: 'Get started' }]} />
        </SidebarLayout.Header>
        <SidebarLayout.Content>
          <PageShell width="wide">
            <PageTitle
              title="Get started"
              description="A few quick steps to personalize September for you."
            />
            <OnboardingFlow />
          </PageShell>
        </SidebarLayout.Content>
      </OnboardingProvider>
    </SpeechProvider>
  );
}
