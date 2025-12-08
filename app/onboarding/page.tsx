import type { Metadata } from 'next';

import { OnboardingProvider } from '@/components-v4/onboarding/context';
import { Onboarding } from '@/components-v4/onboarding/onboarding';
import { AISettingsProvider } from '@/components-v4/settings';
import SidebarLayout from '@/components-v4/sidebar/layout';
import { SpeechProvider } from '@/components-v4/speech';

export const metadata: Metadata = {
  title: 'Onboarding',
  description: 'Get started with September',
};

export default async function OnboardingPage() {
  return (
    <AISettingsProvider>
      <SpeechProvider>
        <OnboardingProvider>
          <SidebarLayout>
            <SidebarLayout.Header>
              <h1 className="text-2xl font-bold tracking-tight">Get Started</h1>
            </SidebarLayout.Header>

            <SidebarLayout.Content>
              <Onboarding />
            </SidebarLayout.Content>
          </SidebarLayout>
        </OnboardingProvider>
      </SpeechProvider>
    </AISettingsProvider>
  );
}
