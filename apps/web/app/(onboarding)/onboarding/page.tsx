'use client';

import { OnboardingFlow, OnboardingProvider } from '@september/onboarding';
import { SpeechProvider } from '@september/speech';

export default function OnboardingPage() {
  return (
    <SpeechProvider>
      <OnboardingProvider>
        <OnboardingFlow />
      </OnboardingProvider>
    </SpeechProvider>
  );
}
